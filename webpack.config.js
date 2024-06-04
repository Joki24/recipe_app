const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const Libpq = require('libpq');

module.exports = {
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  target: 'node', // This is important to avoid bundling of node specific modules for browser
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.html$/,
        use: ['html-loader'],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  resolve: {
    fallback: {
      fs: false,
      path: require.resolve('path-browserify'),
      process: require.resolve('process/browser'),
      crypto: require.resolve('crypto-browserify'),
      zlib: require.resolve('browserify-zlib'),
      os: require.resolve('os-browserify/browser'),
      dns: false,
      net: false,
      tls: false,
      stream: require.resolve('stream-browserify'),
      http: require.resolve('stream-http'),
      querystring: require.resolve('querystring-es3'),
      vm: require.resolve('vm-browserify'),
      'node-gyp': false,
      npm: false,
    },
  },
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /^async_hooks$/,
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^child_process$/,
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^@mapbox\/node-pre-gyp$/,
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^bcrypt$/,
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^express$/,
    }),
    new webpack.ContextReplacementPlugin(
      /@mapbox\/node-pre-gyp\/lib\/util/,
      (context) => {
        if (!/versioning/.test(context.request)) {
          return;
        }
        Object.assign(context, {
          request: context.request.replace(/^.*$/, 'some-static-path'),
        });
      }
    ),
    new webpack.IgnorePlugin({
      resourceRegExp: /^node-gyp$/,
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^npm$/,
    }),
  ],
  stats: {
    errorDetails: true,
  },
};
