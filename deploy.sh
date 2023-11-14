#!/bin/bash

set -e

npm run docs:build

cd docs/.vuepress/dist

git init
git add -A
git commit -m "deploy"

git remote add origin git@github.com:Lqinggang/myLinuxBlogs.git
git push -f --set-upstream origin master
