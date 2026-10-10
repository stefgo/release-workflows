# release-workflows

The release workflow and the semantic-release configuration shared by the stefgo
projects. A project calls the two workflows here and carries no release tooling of its own.

## What a release is

- It is started by hand, in the project's **Actions** tab, with two inputs.
- It comes from `main` (a stable version) or from `dev` (a beta, `x.y.z-beta.n`, published
  as a prerelease). No other branch may release.
- Its notes have a hand-written part, and that part is mandatory.

| Input | Values | Meaning |
|---|---|---|
| `dry_run` | on (default) / off | Shows the next version and the complete notes in the run's summary. Changes nothing. |
| `bump` | `auto` (default), `patch`, `minor`, `major` | `auto` reads the commit types. Any other value is the step that is taken, whatever the commits say. |

With `auto`, `feat` raises the minor position and `fix`, `perf` and `revert` the patch
position; every other type releases nothing. A `BREAKING CHANGE:` footer raises the minor
position in an application and the major position in a library (the `breaking` input of the
called workflow). A step chosen by hand may be lower than what `auto` would take, and it
releases when `auto` would find nothing to release.

## The notes

A release is described in three parts:

1. **`.release/next.md`** — written by hand: what is new, why it matters, what an upgrade
   needs. It is placed directly below the version heading. A release with nothing in this
   file is refused, in the dry run already. Text inside an HTML comment is not published.
2. **The list of commits** — generated, in this order: breaking changes, features, bug
   fixes, performance, reverts, dependencies (`build(deps)`).
3. **`.release/footer.md`** — optional, the same for every release of a project: how to
   install it, where the image is. `{{version}}` and `{{tag}}` are filled in. It appears on
   the release page only, not in `CHANGELOG.md`.

A beta uses `.release/next.md` and leaves it as it is, so the text grows from the first
beta to the stable release. The stable release empties the file again and removes the
entries of its betas from `CHANGELOG.md`; the betas remain on the releases page.

## main and dev

semantic-release finds a version through the tags its branch contains, so the two branches
have to contain each other's releases. Three rules follow, and each is checked:

- **`dev` is merged into `main` with its history** — no squash, no rebase. A stable release
  is refused when a beta of the same or a lower version is not part of `main`. A beta of a
  higher version only raises a warning: that is what a fix released ahead of `dev` looks like.
- **`main` is merged back into `dev`** before the next beta. A beta is refused while the
  last stable version is not part of `dev`.
- After a stable release the workflow fast-forwards `dev` to the release commit itself, if
  `dev` has nothing `main` lacks. Otherwise it says so and leaves `dev` alone.

The check cannot see a squash whose beta was of a higher version than the one being
released; the warning is all it can give there.

## Using it in a project

`.github/workflows/release.yml` of the project:

```yaml
name: Create Release

on:
    workflow_dispatch:
        inputs:
            dry_run:
                description: "Dry run -- shows the next version and its notes, changes nothing"
                type: boolean
                default: true
            bump:
                description: "Version step"
                type: choice
                options: [auto, patch, minor, major]
                default: auto

concurrency:
    group: release-${{ github.ref }}
    cancel-in-progress: false

jobs:
    preflight:
        uses: stefgo/release-workflows/.github/workflows/preflight.yml@v1
        permissions:
            contents: read

    checks:
        needs: preflight
        uses: ./.github/workflows/ci.yml

    release:
        needs: checks
        uses: stefgo/release-workflows/.github/workflows/release.yml@v1
        permissions:
            contents: write # tag, release, CHANGELOG/package.json commit
            issues: write # @semantic-release/github comments on issues ...
            pull-requests: write # ... and on pull requests
            actions: write # only with build_workflow
        with:
            dry_run: ${{ inputs.dry_run }}
            bump: ${{ inputs.bump }}
            build_workflow: build.yml
```

What differs between projects is an input of the called workflow:

| Input | For | Meaning |
|---|---|---|
| `breaking` | all | What a `BREAKING CHANGE:` footer raises with `bump: auto`: `minor` (default, applications) or `major` (libraries). |
| `build_workflow` | images | A workflow of the project that is started on the new tag and waited for. |
| `npm_publish` | libraries | Publishes the package to the registry of its `publishConfig`; a beta goes to the `beta` dist-tag. |
| `version_files` | Home Assistant | JSON files besides the root `package.json` that carry the version, such as `manifest.json`. |
| `build_command` | Home Assistant | Run after the version is written and before the commit and the tag, to build what is attached. |
| `release_assets` | Home Assistant | Files attached to the GitHub release. |
| `release_name` | Home Assistant | Title of the release, such as `Log Notifier {{version}}`; the tag without it. |

A token that may push to a protected `main` can be passed as the secret `release_token`;
without it the workflow uses `GITHUB_TOKEN`.

Next to it the project needs `.release/next.md` (start from
[`templates/next.md`](templates/next.md)) and, if it wants one, `.release/footer.md`. It
needs no `release` entry in `package.json` and none of the semantic-release packages.

## Changing this repository

`npm test` runs the tests; the rules between `main` and `dev` are tested against real
throwaway repositories.

The projects call `@v1`, and both workflows check this repository out at `v1` as well. A
change reaches them when the tag is moved:

```bash
git tag -f v1 && git push -f origin v1
```

Move it only for a change every project can take unchanged. Anything else is a `v2`: a new
tag, and the `ref:` of the two tooling checkouts changed along with it.
