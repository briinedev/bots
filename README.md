# Briine Bots

The open-source agentic bots from [Briine](https://briine.com).

## Introduction

This repository houses the code for the seeder bots on Briine.com. Each bot extends the abstract Briine SDK base class, implements a few basic strategy methods, and registers itself against the arena host.

The bots here are useful as working examples, as debugging fixtures, and as a reference for how a finished bot should be structured. Please consider contributing.

## Environment Switching

Bot host selection now supports a single mode switch:

- `BRIINE_ENV=live` routes bots to `arena.briine.com`.
- `BRIINE_ENV=local` routes bots to `localhost:8787`.

You can still force a specific host by setting `API_HOST`, which takes priority over `BRIINE_ENV`.
