# @cfware/ami [![NPM Version][npm-image]][npm-url]

> Astersik Manager Interface

## Install @cfware/ami

This module requires node.js 14.0.0 or above and ES modules.

```sh
npm install @cfware/ami
```

## class AMISocket

```js
import AMISocket from '@cfware/ami';

const ami = new AMISocket();
```

### new AMISocket(options)

Construct a new AMI connection instance.  Default options:
```js
{
  connect: {
    host: 'localhost',
    port: 5038
  },
  credentials: {
    username: 'local',
    secret: 'local'
  },
  events: true
}
```

### AMISocket#amiVersion

Version string provided by the Asterisk server, example `2.10.5`.
This property is `undefined` prior to receiving first line from connected
socket.

### AMISocket#connected

Boolean value if the socket is connected.

### AMISocket#authenticated

Boolean value if the socket is authenticated.

### async AMISocket#connect()

Connect to the AMI server for this instance.  Promise is resolved once authentication is
successful.  Rejection occurs if connection or authentication fails.

This function resolves after queued packets are sent but before responses are received.

### AMISocket#disconnect()

Disconnect from the AMI server.  No attempt is made to wait for responses to requests that
are in progress.

### async AMISocket#send(object, options)
### async AMISocket#getList(object, options)

`object` is the key/value pairs to send as an AMI request.  This must contain an `action` key.
A key can be specified multiple times by providing an array, for example:
```js
ami.send({
  action: 'originate',
  // channel / app / etc
  variable: [
    'CHANVAR1=value',
    'CHANVAR2=value'
  ]
});
```

`options.ignoreResponse` can be set to `true` if you don't care about the result.  In this
case the promise resolves as soon as the request is written to the socket.

`options.responseType` controls the information provided when resolving:
* `response`: resolves with a single object structured like the input object.  This is default for `AMISocket#send`.
* `responses`: resolves with an array of objects.  This is default for `AMISocket#getList`.
* `responsePacket`: resolves with a single `AMIPacket` instance.
* `responsePackets`: resolves with an array of `AMIPacket` instances.

Keys of all responses are normalized to lowercase strings.

#### AMIPacket#asObject

This is the property which resolve requests that used `responseType` of `response` or `responses`.

#### AMIPacket#values

An ordered array of name/value pairs, for example:
```js
[
  ['actionid', 'random-generated-id'],
  ['response', 'success']
]
```

This is only needed to deal with responses which violate the AMI specification.  An example
of this is the `app_queue` [QueueRule](https://github.com/asterisk/asterisk/blob/2e7866ebb7773fdd4f67e80f3747e41d84bcb93b/apps/app_queue.c#L9744-L9777)
response, see [ASTERISK-27072](https://issues.asterisk.org/jira/browse/ASTERISK-27072).

#### AMIPacket#toString()

This is used internally to produce the raw data.  It could also be used for debug output.
Note that keys are already tranformed to lowercase.

[npm-image]: https://img.shields.io/npm/v/@cfware/ami.svg
[npm-url]: https://npmjs.org/package/@cfware/ami
