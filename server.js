/* eslint no-var: 0, object-shorthand: 0, strict: 0 */
'use strict';
require('babel/register');
var config = require('npcp');
var path = require('path');
var url = require('url');
var React = require('react');
var packagejson = require('./package');
var contentjson = require('@economist/world-if-assets');
var log = require('bunyan-request-logger')({
  name: packagejson.name,
});
log.info(config, 'booting with config');
var stats = packagejson.stats;
stats.name = packagejson.name;
stats.version = packagejson.version;
stats = JSON.stringify(stats);

var HTML = require('@economist/component-world-if-html');
HTML.store.setContent(contentjson);

// connect and middleware
module.exports = require('connect')()
  .use(require('serve-favicon')(
    path.join(__dirname, 'assets', 'favicon.ico')
  ))
  .use(require('compression')({
    level: 9,
  }))
  .use(log.requestLogger())
  .use('/application.manifest', require('connect-cache-manifest')({
    manifestPath: '/',
    files: [
      {
        dir: path.resolve(config.server.root, config.server.assets.dir),
        prefix: '/' + config.server.assets.uri + '/',
      },
    ],
    networks: [ '*' ],
  }))
  .use('/_stats', function sendStats(request, response) {
    response.setHeader('Content-Type', 'application/json;charset=utf-8');
    response.end(stats);
  })
  .use('/content', require('@economist/connect-filter-jsonapi')({
    content: contentjson.data[0].relationships.posts.data,
  }))
  .use('/' + config.server.assets.uri, require('st')({
    path: path.resolve(config.server.root, config.server.assets.dir),
    gzip: false,
    passthrough: true,
    dot: false,
    index: false,
  }))
  .use(function handleReactRouterComponent(request, response, next) {
    try {
      response.setHeader('Content-Type', 'text/html;charset=utf-8');
      response.end(
        '<!doctype html>' +
        React.renderToStaticMarkup(
          React.createElement(HTML, {
            path: url.parse(request.url).pathname,
            styles: require('./css-assets'),
            inlineStyles: require('./css-inline'),
            scripts: require('./js-assets'),
            inlineScripts: require('./js-inline'),
          })
        )
      );
    } catch(err) {
      return next(err);
    }
  })
  .use(log.errorLogger());
if (require.main === module) {
  module.exports.listen(config.server.port, function serve() {
    var address = this.address();
    address.url = 'http://localhost:' + address.port;
    log.info({ address: address }, 'Server running');
  });
}
