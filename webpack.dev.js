const path = require('path');
const common = require('./webpack.common.js');
const { merge } = require('webpack-merge');

module.exports = merge(common, {
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
    ],
  },
  devServer: {
  static: [
    {
      directory: path.join(__dirname, 'src/public'),
    },
    {
      directory: path.join(__dirname, 'styles'), // Tambahan ini!
    },
  ],
  port: 9001,
  client: {
    overlay: {
      errors: true,
      warnings: true,
    },
  },
},

});
