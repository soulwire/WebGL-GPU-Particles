var HtmlWebpackPlugin = require('html-webpack-plugin');
var webpack = require('webpack');
var isDev = process.argv.indexOf('-p') === -1;
var config = {
  context: __dirname + '/source',
  entry: {
    main: './index.js'
  },
  output: {
    path: __dirname + '/deploy',
    filename: '[name]-[hash:6].js'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel',
      exclude: /(node_modules)/,
      query: {
        presets: ['es2015', 'stage-0']
      }
    },{
      test: /\.(glsl|vs|fs)$/,
      loader: 'shader'
    },{
      test: /\.(jpg|png)$/,
      loader: 'url?limit=0'
    }]
  },
  resolve: {
    extensions: ['', '.js']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html'
    })
  ]
};
if (isDev) {
  config.devtool = 'eval-source-map';
} else {
  config.plugins.push(
    new webpack.optimize.AggressiveMergingPlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compress: { warnings: false }
    }),
    new webpack.optimize.DedupePlugin()
  );
}
module.exports = config;