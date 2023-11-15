#!/bin/bash

set -e

npm run docs:build

cd docs/.vuepress/dist

git init
git add -A
git commit -m "deploy"
git branch -m master main

git remote add origin git@github.com:Lqinggang/myLinuxBook.git
git push -f git@github.com:Lqinggang/myLinuxBook.git main:gh-pages
