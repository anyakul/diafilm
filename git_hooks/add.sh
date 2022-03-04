#!/bin/bash

cd ../.git/hooks/
rm post-merge
ln -s ../../git_hooks/post-merge post-merge
cd ../../
printf "\nDone!\n"
