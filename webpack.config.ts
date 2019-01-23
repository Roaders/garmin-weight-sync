
import { resolve } from "path";

module.exports = {
    entry: {
        popup: "./src/popup.ts",
        options: "./src/options.ts",
        background: "./src/background.ts",
    },
    mode: "production",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: '[name].bundle.js',
        path: resolve(__dirname, 'dist')
    }
};