#!make

#* Variables
SHELL := /usr/bin/env bash
PYTHON := python

#* Docker variables
PROJECT := diafilms
IMAGE := registry.gitlab.com/toptalo/diafilm/backend
VERSION := latest

#* Custom variables
CMD := help

#* Custom shit
.PHONY: help
help:
	@echo -n "* Available make targets"
	@echo ":"
	@cat Makefile | sed -n '/^\.PHONY: / h; /\(^\t@*echo\|^\t:\)/ {H; x; /PHONY/ s/.PHONY: \(.*\)\n.*"\(.*\)"/  make \1\t\2/p; d; x}'| sort -k2,2 |expand -t 20

.PHONY: requirements
requirements:
	pip-compile requirements/base.in -o requirements/base.txt


.PHONY: lint
lint:
	isort .
	autoflake --in-place --remove-all-unused-imports .

.PHONY: build
build:
	docker compose build --pull backend --build-arg VERSION=$(version)

.PHONY: start
start:
	docker compose pull
	docker compose -p ${PROJECT} up -d --wait

.PHONY: stop
stop:
	docker compose -p ${PROJECT} down

.PHONY: logs
logs:
	docker compose -p ${PROJECT} logs backend -f

.PHONY: exec
exec:
	docker compose -p ${PROJECT} exec backend bash
