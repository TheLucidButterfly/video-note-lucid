const path = require('path');

module.exports = {
  mode: 'production', // Set Webpack mode to production
  entry: './src/index.js', // Adjust to the main entry point of your app
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'), // Output to the dist folder
  },
  module: {
    rules: [
      {
        test: /\.js$/, // Process JavaScript files
        exclude: /node_modules/,
        use: 'babel-loader', // Transpile with Babel if needed
      },
    ],
  },
  optimization: {
    minimize: true, // Ensures minification is enabled
  },
};