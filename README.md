# Living Themes — animated worlds for Claude Code

**English** | [Türkçe](README.tr.md)

[**View all 48 themes →**](docs/gallery/README.md)

Open the image gallery for the full-size preview. [Turkish gallery](docs/gallery/README.tr.md).

**Run `claude` → type `/theme` → pick a theme.** Living Themes adds 48 animated ASCII worlds across your entire terminal, with Claude's conversation, input, menus, and diff colors in the foreground. No VS Code, browser, or separate desktop app is required.

The installer connects the live renderer to the normal `claude` command in interactive zsh sessions. It uses your installed Claude Code and existing account. Animations run locally without model requests or additional tool permissions.

## Getting started

Requirements: **Node.js 24+**, **Claude Code**, and **zsh** for automatic shell integration. The current distribution targets **macOS on Apple Silicon**.

From the project directory, install the Claude plugin and shell integration:

```sh
bash scripts/install-terminal.sh
```

Open a **new terminal**, then run:

```sh
claude
```

Inside Claude, use **`/theme` → `Living · Koi Pond`**, or choose any other Living theme. Resume an existing conversation with `claude --resume` or `/resume` inside Claude.

The launcher starts a new real Claude process; it does not move an already running session. After updating, open a new session to load the updated renderer. `/reload-plugins` alone does not replace the renderer already running in memory.

### Manual launch and options

You can also launch explicitly, including from shells without automatic integration:

```sh
~/.local/bin/living
~/.local/bin/living --resume
~/.local/bin/living --living-theme koi-pond
```

`--living-theme` sets the initial scene; your next `/theme` selection takes over. Other Claude arguments are forwarded unchanged.

| Launcher option                   | Purpose                                    |
| --------------------------------- | ------------------------------------------ |
| `--living-claude /path/to/claude` | Choose the Claude executable               |
| `--living-fps 15`                 | Set the frame rate; default 10, range 1–30 |
| `--living-list`                   | List the available themes                  |
| `--living-doctor`                 | Show installation diagnostics              |
| `--living-help`                   | Show launcher help                         |

For a still scene, launch with `LIVING_THEMES_REDUCE_MOTION=1 ~/.local/bin/living`.

## Controls inside Claude

| Command                            | Action                                                      |
| ---------------------------------- | ----------------------------------------------------------- |
| `/theme`                           | Choose a theme using Claude's native picker                 |
| `/living`                          | Open motion, visibility, brightness, and intensity controls |
| `/living pause` / `/living resume` | Freeze the current frame or resume animation                |
| `/living hide` / `/living show`    | Hide or show the scene                                      |
| `/living brightness 65`            | Set brightness as a percentage                              |
| `/living intensity 40`             | Set motion intensity as a percentage                        |
| `/living status`                   | Inspect local and shared preferences                        |
| `/exit`                            | Close Claude and return to your shell                       |

Sessions using the same `CLAUDE_CONFIG_DIR` share their scene selection and controls. Selecting a built-in theme or another plugin's theme hides the animated figures. Other open Claude sessions may still need the same custom theme selected through `/theme` to match their accent colors.

## 48 worlds

| Video inspirations | Quiet nature | Space         | Cities and fantasy |
| ------------------ | ------------ | ------------- | ------------------ |
| Claude Ember       | Fireflies    | Aurora        | Neon Tokyo         |
| Cloud Drift        | Moonlit      | Saturn Rings  | Matrix Rain        |
| Honu Lagoon        | Sakura Rain  | Meteor Shower | Synthwave Road     |
| Koi Pond           | Bamboo Mist  | Nebula        | Clockwork Garden   |
| Jellyfish          | Autumn Creek | Lunar Horizon | Crystal Cave       |
| Paper Boats        | Snow Cabin   | Solar Flare   | Lava Forge         |

### 24 more worlds introduced in 0.4

| Ocean depths     | Sky tales        | Hidden worlds     | Cosmic playground |
| ---------------- | ---------------- | ----------------- | ----------------- |
| Whale Song       | Dragon Flight    | Mushroom Grove    | Black Hole        |
| Manta Ballet     | Phoenix Rise     | Enchanted Library | Orbital Station   |
| Seahorse Reef    | Butterfly Meadow | Teahouse Rain     | Rocket Launch     |
| Octopus Den      | Floating Islands | Desert Caravan    | Alien Orchard     |
| Coral Garden     | Sky Lanterns     | Bonsai Zen        | Retro Arcade      |
| Submarine Voyage | Thunderstorm     | Midnight Express  | Hologram City     |

Each scene has its own composition and motion. Large figures, particles, and environmental textures adapt to the terminal dimensions while respecting character-cell proportions. Quiet backing behind text keeps scene characters out of the spaces between words.

`npm run preview` generates a local, searchable, pausable HTML gallery of all 48 worlds. This gallery uses the full-area scene engine; it is not a screenshot of a Claude conversation.

## How it works

A PTY compositor runs the real Claude CLI. Its terminal output passes through xterm's headless VT parser. The compositor preserves text cells and explicit background colors, then paints the animated world into the remaining space. This replaces the original four-line animation strip with a full-terminal scene.

Claude's mod API does not expose a general background layer, so the renderer must connect when the session starts. The zsh integration handles that automatically.

The installer adds one marked loading block to `.zshrc` and saves the previous file as `.zshrc.living-themes-backup` with private `0600` permissions. Existing settings are preserved. The installed Claude binary and `PATH` are unchanged.

`claude -p`, help/version commands, plugin and MCP management, SDK streams, redirects, and pipes go directly to the real CLI. Accessibility mode, background/desktop sessions, and nested invocations bypass animation. To bypass it manually, use:

```sh
LIVING_THEMES_DISABLE=1 claude
# Or bypass the shell function:
command claude
```

Preferences live in `$CLAUDE_CONFIG_DIR/plugins/living-themes/state-v1/`, defaulting to `~/.claude/plugins/living-themes/state-v1/`. The launcher does not save your conversations to files. Diagnostic PTY tests record only their own temporary sessions and make no model requests.

## Development

To build from source:

```sh
npm run build
cd terminal
npm ci
npm run build
npm test
cd ..
npm test
claude plugin test .
claude plugin validate --strict .
```

- `shared/world.ts`: the 48 full-area scene compositions.
- `terminal/src/compositor.ts`: character-cell rendering and text composition.
- `terminal/src/main.ts`: PTY connection and terminal lifecycle.
- `terminal/src/routing.ts`: automatic interactive CLI routing.
- `terminal/shell/claude.zsh`: the zsh integration.

The terminal package has its own `node-pty`, `@xterm/headless`, and esbuild dependencies. The earlier VS Code experiment remains in the source tree; the terminal version builds and runs independently of it.

## Limitations and validation

These scenes are rendered with terminal character cells. They apply the full-area animated-wallpaper idea to the real Claude CLI, rather than reproducing the reference desktop fan concept pixel for pixel. The original reference video's assets are not distributed.

The compositor uses the terminal's alternate screen, keeping animation frames out of ordinary shell scrollback. Mouse selection, copying, scrolling, and screenshot behavior can vary by terminal application. If selection becomes difficult during animation, use `/living pause` first. Visual acceptance has not covered every terminal application or every permission screen.

See [validation details](docs/VALIDATION.md) for the distinction between automated tests, real PTY recordings, and behavior that has not yet been verified. That report is currently in Turkish.

## Uninstall

To remove only automatic zsh integration, run this from the project directory and open a new terminal:

```sh
python3 scripts/install-shell.py --remove
```

Manual launching with `~/.local/bin/living` remains available.

To remove the Claude plugin and shell integration:

```sh
bash scripts/uninstall.sh
```

You can also delete the `~/.local/bin/living` symlink. The project and your installed Claude Code are preserved.

## References

- [Claude Code mod rendering surfaces](https://code.claude.com/docs/en/plugins/mods/interface)
- [Original fan concept](https://x.com/handsher_NGU/status/2115618341675319417)
- [xterm.js](https://github.com/xtermjs/xterm.js)
- [node-pty](https://github.com/microsoft/node-pty)
