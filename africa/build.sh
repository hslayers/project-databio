#!/bin/sh
sh compile_translations.sh
node browserify.js
grunt