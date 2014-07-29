# GSocket

[![Build Status](https://secure.travis-ci.org/goliatone/gsocket.png)](http://travis-ci.org/goliatone/gsocket)

WebSocket client library

## Getting Started
Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/emiliano/gsocket/master/dist/gsocket.min.js
[max]: https://raw.github.com/emiliano/gsocket/master/dist/gsocket.js

## Development
`npm install && bower install`

If you need to `sudo` the `npm` command, you can try to:

```terminal
sudo chown $(whoami) ~/.npm
sudo chown $(whoami) /usr/local/share/npm/bin
sudo chown -R $(whoami) /usr/local/lib/node_modules
```


If you bump versions, remember to update:
- package.json
- bower.json
- component.json
- etc.


## Bower
>Bower is a package manager for the web. It offers a generic, unopinionated solution to the problem of front-end package management, while exposing the package dependency model via an API that can be consumed by a more opinionated build stack. There are no system wide dependencies, no dependencies are shared between different apps, and the dependency tree is flat.

To register gsocket in the [bower](http://bower.io/) [registry](http://sindresorhus.com/bower-components/):
`bower register gsocket git://github.com/goliatone/gsocket.git`

Then, make sure to tag your module:

`git tag -a v0.1.0 -m "Initial release."`

And push it:

`git push --tags`


## Travis
In order to enable Travis for this specific project, you need to do so on your Travi's [profile](https://travis-ci.org/profile). Look for the entry `goliatone/gsocket`, activate, and sync.


## Documentation
_(Coming soon)_

## Examples
_(Coming soon)_

## Release History
_(Nothing yet)_


## Notes:

TODO: Redo error handling. Right now error === reconnect, which is dumb.

http://pusher.com/docs/pusher_protocol

```
Clients may close the WebSocket connection at any time.

The Pusher server may choose to close the WebSocket connection, in which case a close code and reason will be sent.

Clients SHOULD support the following 3 ranges

4000-4099: The connection SHOULD NOT be re-established unchanged.

4100-4199: The connection SHOULD be re-established after backing off. The back-off time SHOULD be at least 1 second in duration and MAY be exponential in nature on consecutive failures.

4200-4299: The connection SHOULD be re-established immediately.

Clients MAY handle specific close codes in particular way, but this is generally not necessary. See error codes below for a list of errors.
```

