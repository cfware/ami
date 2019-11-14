/* eslint no-await-in-loop: 0 */
const path = require('path');
const EventEmitter = require('events');
const childProcess = require('child_process');
const fs = require('fs');
const {promisify} = require('util');

const fromEntries = require('fromentries');
const pMap = require('p-map');
const glob = require('fast-glob');
const which = require('which');
const rimraf = promisify(require('rimraf'));
const makeDir = require('make-dir');

const execFile = promisify(childProcess.execFile);
const copyFile = promisify(fs.copyFile);
const writeFile = promisify(fs.writeFile);
const delay = promisify(setTimeout);
const fixturePath = (...args) => path.resolve(__dirname, '../fixtures', ...args);

const flatMap = [].flatMap ?
	(arr, mapper) => arr.flatMap(mapper) :
	(arr, mapper) => [].concat(...arr.map(mapper));

module.exports = class AsteriskInstance extends EventEmitter {
	constructor() {
		super();

		this.baseDir = fixturePath('instance');
		this.asteriskConf = this.runDir('etc/asterisk/asterisk.conf');
		this.astetcdir = this.runDir('etc/asterisk');
		this.astvarlibdir = this.runDir('var/lib/asterisk');
		this.astdbdir = this.runDir('var/spool');
		this.astkeydir = this.astvarlibdir;
		this.astdatadir = this.astvarlibdir;
		this.astspooldir = this.runDir('var/spool');
		this.astrundir = this.runDir('run');
		this.astlogdir = this.runDir('var/log');

		this.directories = [
			'astetcdir',
			'astvarlibdir',
			'astdbdir',
			'astkeydir',
			'astdatadir',
			'astspooldir',
			'astrundir',
			'astlogdir'
		];
	}

	runDir(...args) {
		return path.join(this.baseDir, ...args);
	}

	astdir(key, ...args) {
		return path.join(this[key], ...args);
	}

	async installConfigs(id) {
		await pMap(
			await glob(fixturePath(`asterisk-${id}/**/*.conf`)),
			f => copyFile(
				f,
				this.astdir('astetcdir', path.relative(fixturePath(`asterisk-${id}`), f))
			)
		);
	}

	async init() {
		this.bin = await which('asterisk');
	}

	async build() {
		await this.init();

		await rimraf(this.baseDir, {disableglob: true});
		const directories = fromEntries(this.directories.map(id => [id, ['']]));
		Object.assign(directories, {
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

		await pMap(/* Make directories */
			flatMap(Object.entries(directories), ([key, dirs]) => dirs.map(dir => this.astdir(key, dir))),
			dir => makeDir(dir)
		);

		await pMap(/* Copy documentation */
			await glob(fixturePath('asterisk-documentation/*')),
			f => copyFile(f, this.astdir('astvarlibdir', 'documentation', path.basename(f)))
		);

		await this.installConfigs('generic');

		await writeFile(this.runDir('etc/asterisk/asterisk.conf'), [
			'[directories]',
			...this.directories.map(id => `${id}=${this[id]}`),
			'',
			`#include ${this.runDir('etc/asterisk/asterisk-options.conf')}`,
			''
		].join('\n'));
	}

	async start() {
		const proc = childProcess.spawn(this.bin, [
			'-f',
			'-C',
			this.asteriskConf
		], {detached: true, stdio: 'ignore'});

		try {
			await this.fullyBooted();
		} catch (error) {
			proc.child.kill(9);
			throw error;
		}

		proc.unref();
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
};
