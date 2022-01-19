# GNOME Shell Spotify Controller

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

**This extension is a fork of [gnome-shell-extension-spotify-controller](https://github.com/koolskateguy89/gnome-shell-extension-spotify-controller)**. Credit for the original code belongs to the respective owners and contributers.

**Table of Contents**

- [Features](#features)
- [Installation](#installation)
- [Prerequisites](#prerequisites)
- [License](#license)

## Features
* Playback Controls: Skip, pause, or go back a track from the convenience of the top bar.
* Song Information: View the song name in the top bar. Hover over the name to view the album and artists of the song.
* Close spotify from the top bar by right-clicking the song name and hitting 'close'.
* Bring Spotify to the forefront by left-clicking on the song name
* Event-Based: The extension doesn't run any repeated tasks performing more power-efficiently and accurately.
* Supports Modern Gnome-Shell Versions: The extension supports gnome-shell versions 40 and 41.


## Installation

Currently, this extension requires manual installation:

- **Clone the repo**

  `git clone https://github.com/sanchitgoel01/Spotify-Controller-Gnome-Extension.git`

- **cd into the repo directory**

  `cd gnome-shell-extension-spotify-controller`

- **Copy the extension into your extensions folder (or make a symbolic link if you want)**

  `make install`

  OR

  `cp -R spotify-controller@sanchitgoel01 ~/.local/share/gnome-shell/extensions/`

  OR

  `ln -s "$(pwd)/spotify-controller@sanchitgoel01" ~/.local/share/gnome-shell/extensions/`

- **Restart GNOME Shell or logout then log back in**

  To restart GNOME Shell: Press Alt+F2 then type 'r' (no quotes) and press enter

- **Enable the extension**

  `gnome-extensions-app` then enable 'Spotify Controller'

If you copied the extension, you can delete the repo folder (`cd .. && rm -r gnome-shell-extension-spotify-controller`)

## Prerequisites

The only thing you 'need' is `dbus-send` but I think it comes with GNOME Shell/Linux. To check you have it, simply run the command
```
command -v dbus-send
```
You should see a path pointing to the executable file for `dbus-send` (for me it's `/usr/bin/dbus-send`).

## License

This project is licensed under the GNU General Public License - see the [LICENSE](LICENSE) file for details
