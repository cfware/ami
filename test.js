/* eslint no-await-in-loop: 0 */
import path from 'path';
import {EventEmitter} from 'events';
import childProcess from 'child_process';
import {promises as fs} from 'fs';
import {promisify} from 'util';
import {fileURLToPath} from 'url';

import t from 'libtap';
import pMap from 'p-map';
import _glob from 'glob';
import which from 'which';
import isCI from 'is-ci';

const glob = promisify(_glob);
const execFile = promisify(childProcess.execFile);
const delay = promisify(setTimeout);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = (...args) => path.join(dirname, 'fixtures', ...args);
const instancePath = (...args) => fixturePath('instance', ...args);

class AsteriskInstance extends EventEmitter {
	baseDir = instancePath();
	asteriskConf = instancePath('etc/asterisk/asterisk.conf');
	astetcdir = instancePath('etc/asterisk');
	astvarlibdir = instancePath('var/lib/asterisk');
	astdbdir = instancePath('var/spool');
	astkeydir = instancePath('var/lib/asterisk');
	astdatadir = instancePath('var/lib/asterisk');
	astspooldir = instancePath('var/spool');
	astrundir = instancePath('run');
	astlogdir = instancePath('var/log');
	directories = [
		'astetcdir',
		'astvarlibdir',
		'astdbdir',
		'astkeydir',
		'astdatadir',
		'astspooldir',
		'astrundir',
		'astlogdir'
	];

	astdir(key, ...args) {
		return path.join(this[key], ...args);
	}

	async installConfigs(id) {
		await pMap(
			await glob(fixturePath(`asterisk-${id}/**/*.conf`)),
			f => fs.copyFile(
				f,
				this.astdir('astetcdir', path.relative(fixturePath(`asterisk-${id}`), f))
			)
		);
	}

	async build() {
		this.bin = await which('asterisk');

		await fs.rmdir(this.baseDir, {recursive: true});
		const directoryEntries = Object.fromEntries(this.directories.map(id => [id, ['']]));
		Object.assign(directoryEntries, {
			astvarlibdir: [
				'keys',
				'moh',
				'documentation',
				'sounds/en'
			],
			astetcdir: [
				'acl.d',
				'cli_permissions.d',
				'confbridge.d',
				'extensions.d',
				'http.d',
				'manager.d',
				'musiconhold.d',
				'sip.d',
				'sip_notify.d',
				'sorcery.d'
			]
		});

		/* Make directories */
		await pMap(
			Object.entries(directoryEntries).flatMap(
				([key, directories]) => directories.map(directory => this.astdir(key, directory))
			),
			directory => fs.mkdir(directory, {recursive: true})
		);

		/* Copy documentation */
		await pMap(
			await glob(fixturePath('asterisk-documentation/*')),
			f => fs.copyFile(f, this.astdir('astvarlibdir', 'documentation', path.basename(f)))
		);

		await this.installConfigs('generic');

		await fs.writeFile(instancePath('etc/asterisk/asterisk.conf'), [
			'[directories]',
			...this.directories.map(id => `${id}=${this[id]}`),
			'',
			`#include ${instancePath('etc/asterisk/asterisk-options.conf')}`,
			''
		].join('\n'));
	}

	async start() {
		this.proc = childProcess.spawn(this.bin, [
			'-f',
			'-C',
			this.asteriskConf
		], {stdio: 'ignore'});

		try {
			await this.fullyBooted();
		} catch (error) {
			this.proc.child.kill(9);
			throw error;
		}
	}

	async stop() {
		await this.cliCommand('core stop gracefully').catch(() => {});
	}

	cliCommand(command) {
		if (!this.bin) {
			throw new Error('Not started');
		}

		return execFile(this.bin, [
			'-C',
			this.asteriskConf,
			'-rx',
			command
		]);
	}

	async fullyBooted() {
		let attempt = 0;
		while (attempt < 100) {
			try {
				await delay(100);
				await this.cliCommand('core waitfullybooted');
				return;
			} catch (_) {
				attempt++;
			}
		}

		throw new Error('Failed to start asterisk');
	}
}

const ignore = isCI ? ['test/socket.js'] : [];
if (!isCI) {
	const asterisk = new AsteriskInstance();

	t.test('start asterisk', async () => {
		await asterisk.build();
		await asterisk.start();
	});

	t.teardown(() => asterisk.stop());
}

for (const file of glob.sync('test/*.js', {ignore})) {
	t.spawn(process.execPath, [file], file);
}
