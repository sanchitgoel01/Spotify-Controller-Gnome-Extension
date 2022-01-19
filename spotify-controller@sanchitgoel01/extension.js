const { GLib, Gio, GObject, St, Clutter } = imports.gi;

const ByteArray = imports.byteArray;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const schemaId = Me.metadata['settings-schema'];
const BoxPointer = imports.ui.boxpointer;
const SpotifyWrapper = Me.imports.spotifyinterface;
const SpotifyWindow = Me.imports.spotifywindow;

//const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.spotify-controller');
const settings = (function() {  // basically copied from ExtensionUtils.getCurrentExtension() in recent Gnome Shell versions
    const GioSSS = Gio.SettingsSchemaSource;

    // Load schema
    let schemaSource = GioSSS.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        GioSSS.get_default(),
        false
    );

    let schemaObj = schemaSource.lookup(
        schemaId,
        true
    );

    if (!schemaObj)
        throw new Error(`Schema could not be found for extension ${Me.metadata.uuid}. Please check your installation`);

    // Load settings from schema
    return new Gio.Settings({ settings_schema: schemaObj });
})();

// variables to help
var lastExtensionPlace, lastExtensionIndex;
var showInactive, hide = true;
var enableControls = true;

// signals
var onLeftPaddingChanged, onRightPaddingChanged;
var onExtensionPlaceChanged, onExtensionIndexChanged;
var onPrevIconColorChanged, onNextIconColorChanged;
var onPauseIconColorChanged, onPlayIconColorChanged;	// wow these variables have long names

function styleStr(direction, iconType) {
	return `
		padding-${direction}: ${settings.get_int(direction + "-padding")}px;
		color: ${settings.get_string(iconType + "-icon-color")};
		`;
}

const backward 	= 'media-skip-backward-symbolic';
const forward 	= 'media-skip-forward-symbolic';
const play 		= 'media-playback-start-symbolic';
const pause 	= 'media-playback-pause-symbolic';

const CloseAppItem = GObject.registerClass(
	class CloseAppitem extends PopupMenu.PopupBaseMenuItem {
		_init(params) {
			super._init(params);
			this.btn_label = new St.Label({
				text: "Close",
			});
			this.add_child(this.btn_label);

			this.connect('button-press-event', () => {
				SpotifyWindow.close();
			});
		}
	}
)

const SongDescriptionItem = GObject.registerClass(
	class SongDescItem extends PopupMenu.PopupBaseMenuItem {
		_init(params) {
			super._init(params);

			this._lineBox = new St.BoxLayout();

			this._artIcon = new St.Icon();
			this._lineBox.add_child(this._artIcon);

			this._songDescBox = new St.BoxLayout({
				style_class: 'song-description',
				vertical: true
			});

			this._songLabel = new St.Label({
				text: "Test Song Name",
				style_class: 'song-title',
				y_align: Clutter.ActorAlign.CENTER
			});

			this._songDescBox.add_child(this._songLabel);

			this._album = new St.Label({
				text: "Test Album",
				style_class: 'song-album',
				y_align: Clutter.ActorAlign.CENTER,
				x_align: Clutter.ActorAlign.CENTER
			});

			this._songDescBox.add_child(this._album);

			this._artist = new St.Label({
				text: "Test Artist",
				y_align: Clutter.ActorAlign.CENTER,
				x_align: Clutter.ActorAlign.CENTER
			})

			this._songDescBox.add_child(this._artist);

			this._lineBox.add_child(this._songDescBox);
			this.add_child(this._lineBox);
		}

		updateSong(song) {
			let icon = Gio.icon_new_for_string(song.artUrl);
			this._artIcon.set_gicon(icon);
			this._songLabel.set_text(song.title);
			this._album.set_text(song.album);
			this._artist.set_text(song.artists.join(', '));
		}
	}
);

const SongMenu = GObject.registerClass(
	class SongMenu extends PanelMenu.Button {
		_init() {
			super._init(0.0, 'Song Menu');
			// Allow the menu to be re-parented.
			this.container.child = null;
			this.container.destroy();

			// Override the toggle function in the menu to change the click event.
			this.menu.toggle = function() { return; };
			this._descItem = new SongDescriptionItem();

			this._songLabel = new St.Label({
				text: "Test Song Name",
				style_class: 'song-label',
				y_align: Clutter.ActorAlign.CENTER
			});
	
			this.add_child(this._songLabel);
			
			this.connect('enter-event', this._onHoverEnter.bind(this));
			this.connect('leave-event', this._onHoverLeave.bind(this));
	
			this.menu.addMenuItem(this._descItem);
			this.initCloseMenu(new PopupMenu.PopupMenu(this, 0.0, St.Side.TOP, 0));
			this.close_menu.addMenuItem(new CloseAppItem());
		}

		initCloseMenu(menu) {
			if (this.close_menu)
				this.close_menu.destroy();
	
			this.close_menu = menu;
			if (this.close_menu) {
				this.close_menu.actor.add_style_class_name('panel-menu');
				this.close_menu.connect('open-state-changed', this._onCloseMenuOpenStateChanged.bind(this));
				// this.menu.actor.connect('key-press-event', this._onMenuKeyPress.bind(this));
	
				Main.uiGroup.add_actor(this.close_menu.actor);
				this.close_menu.actor.hide();
			}
		}

		_onCloseMenuOpenStateChanged(menu, open) {
			// Setting the max-height won't do any good if the minimum height of the
			// menu is higher then the screen; it's useful if part of the menu is
			// scrollable so the minimum height is smaller than the natural height
			let workArea = Main.layoutManager.getWorkAreaForMonitor(Main.layoutManager.primaryIndex);
			let scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;
			let verticalMargins = this.close_menu.actor.margin_top + this.close_menu.actor.margin_bottom;
	
			// The workarea and margin dimensions are in physical pixels, but CSS
			// measures are in logical pixels, so make sure to consider the scale
			// factor when computing max-height
			let maxHeight = Math.round((workArea.height - verticalMargins) / scaleFactor);
			this.close_menu.actor.style = 'max-height: %spx;'.format(maxHeight);
		}

		vfunc_event(event) {
			if (event.type() == Clutter.EventType.BUTTON_PRESS) {
				let buttonAction = event.get_button();

				// 1 = Left Click ; 3 = Right Click
				if (buttonAction == 1) {
					SpotifyWindow.activate();
				}
				else if (buttonAction == 3) {
					this.close_menu.toggle();
				}

				return Clutter.EVENT_PROPAGATE;
			}

			return super.vfunc_event(event);
		}

		vfunc_hide() {
			super.vfunc_hide();
	
			if (this.close_menu)
				this.close_menu.close();
		}

		_onHoverEnter(_) {
			if (!this.menu.isOpen) {
				this.menu.open(BoxPointer.PopupAnimation.FULL);
			}
		}

		_onHoverLeave(_) {
			if (this.menu.isOpen) {
				this.menu.close(BoxPointer.PopupAnimation.FULL);
			}
		}

		updateSong(song) {
			this._songLabel.set_text(song.title);
			this._descItem.updateSong(song);
		}

		_onDestroy() {
			if (this.close_menu)
				this.close_menu.destroy();
			
			super._onDestroy();
		}
	}
);

const Previous = GObject.registerClass(
class Previous extends St.Icon {
	_init(controlBar) {
		super._init({
            track_hover: true,
            can_focus: true,
            reactive: true,
            icon_name: backward,
            style_class: 'system-status-icon',
            style: styleStr('left', 'prev'),
        });

		// Listen for update of left padding in settings
        onLeftPaddingChanged = settings.connect(
			'changed::left-padding',
			this._styleChanged.bind(this)
		);

		onPrevIconColorChanged = settings.connect(
			'changed::prev-icon-color',
			this._styleChanged.bind(this)
		);

        this.connect('button-press-event', () => {
			if (enableControls) {
				SpotifyWrapper.previousTrack();
				controlBar.toggle._pauseIcon();
			}
		});
	}

	_styleChanged() {
		this.set_style(styleStr('left', 'prev'));
	}
});

const Next = GObject.registerClass(
class Next extends St.Icon {
	_init(controlBar) {
		super._init({
            track_hover: true,
            can_focus: true,
            reactive: true,
            icon_name: forward,
            style_class: 'system-status-icon',
            style: styleStr('right', 'next'),
        });

		// Listen for update of right padding in settings
        onRightPaddingChanged = settings.connect(
			'changed::right-padding',
			this._styleChanged.bind(this)
		);

		onNextIconColorChanged = settings.connect(
			'changed::next-icon-color',
			this._styleChanged.bind(this)
		);

        this.connect('button-press-event', () => {
			if (enableControls) {
				SpotifyWrapper.nextTrack();
				controlBar.toggle._pauseIcon();
			}
		});
	}

	_styleChanged() {
		this.set_style(styleStr('right', 'next'));
	}
});

const Toggle = GObject.registerClass(
class Toggle extends St.Icon {
	_init() {
		super._init({
            track_hover: true,
            can_focus: true,
            reactive: true,
            icon_name: play,
            style_class: 'system-status-icon',
            style: 'color: ' + settings.get_string('play-icon-color'),
        });

        onPauseIconColorChanged = settings.connect(
			'changed::pause-icon-color',
			this._styleChanged.bind(this)
		);

		onPlayIconColorChanged = settings.connect(
			'changed::play-icon-color',
			this._styleChanged.bind(this)
		);

		this.connect('button-press-event', this._toggle.bind(this));
	}

	_styleChanged() {
		const current = this.icon_name === play ? 'play' : 'pause';
		this.set_style('color: ' + settings.get_string(`${current}-icon-color`));
	}

	_pauseIcon() {
		this.icon_name = pause;
		this._styleChanged();
	}

	_playIcon() {
		this.icon_name = play;
		this._styleChanged();
	}

	_toggle() {
		if (enableControls) {
			SpotifyWrapper.toggleTrack();
			if (this.icon_name === play) {
				this._pauseIcon();
			} else {
				this._playIcon();
			}
		}
	}
});


const ControlBar = GObject.registerClass(
	class ControlBar extends PanelMenu.Button {
	_init() {
		super._init(0, 'SpotifyController-ControlBar', true);
		this.setSensitive(false);

		this.previous = new Previous(this);

		this.next = new Next(this);

		this.toggle = new Toggle();

		this.bar = new St.BoxLayout();

		settings.connect(
			'changed::show-song',
			this._toggleShowSong.bind(this)
		);

		if (settings.get_boolean('show-song')) {
			this.songMenu = new SongMenu();
			this.bar.add_child(this.songMenu);
		}

		this.bar.add_child(this.previous);
		this.bar.add_child(this.toggle);
		this.bar.add_child(this.next);

		this.add_child(this.bar);
	}

	insertAt(container, index) {
		container.insert_child_at_index(this.container, index);
	}

	removeFrom(container) {
		container.remove_actor(this.container);
	}

	_toggleShowSong(settings, key) {
		let showSong = settings.get_boolean('show-song');
		if (showSong && !this.songMenu) {
			this.songMenu = new SongMenu();
			this.bar.insert_child_at_index(this.songMenu, 0);
			if (SpotifyWrapper.isSpotifyOpen()) {
				this.songMenu.updateSong(SpotifyWrapper.getCurrentSong());
			}
		}
		else if (!showSong && this.songMenu) {
			this.bar.remove_child(this.songMenu);
			this.songMenu = undefined;
		}
	}

	_onDestroy() {
		if (this.toggle._timeout) {
			this.toggle._removeTimeout();
		}
		this.remove_all_children();

		if (this.songMenu) {
			this.songMenu.destroy();
			this.songMenu = null;
		}

		this.previous.destroy();
		this.previous = null;
		this.next.destroy();
		this.next = null;
		this.toggle.destroy();
		this.toggle = null;

		this.bar.remove_all_children();
		this.bar.destroy();
		this.bar = null;
	}
});

class Extension {
	constructor() {}	// do I need to define this???? - isn't it implicitly defined?

	enable() {
		lastExtensionPlace = settings.get_string('extension-place');
		lastExtensionIndex = settings.get_int('extension-index');

		onExtensionPlaceChanged = settings.connect(
			'changed::extension-place',
			this.onExtensionLocationChanged.bind(this)
		);

		onExtensionIndexChanged = settings.connect(
			'changed::extension-index',
			this.onExtensionLocationChanged.bind(this)
		);

		settings.connect(
			'changed::show-inactive',
			this._onShowInactiveChange.bind(this)
		);

		this.controlBar = new ControlBar();

		// Main.panel.addToStatusArea('spotifycontrol-control-bar', this.controlBar, lastExtensionIndex, lastExtensionPlace);

		// andy.holmes is THE man - https://stackoverflow.com/a/59959242
		// poll editing extension location to be able to 'correctly' add to topbar (I have this extension on the left end of the rightBox (0, 'right')
		//   but some other extensions take that spot due to not specifying index (and probably other things idk) so this allows it to actually be where I want)
		//   on startup - although it'll probably lose it if you restart the shell)
		if (lastExtensionIndex == 0)
			GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 0, this.onExtensionLocationChanged.bind(this, settings));

		this.watchId = SpotifyWrapper.watchProcess(this._onSpotifyOpen.bind(this), this._onSpotifyClose.bind(this));

		SpotifyWrapper.propertiesWatcher.connect('changed:PlaybackStatus', this._updatePlayIcon.bind(this));
		SpotifyWrapper.propertiesWatcher.connect('changed:Song', this._onSongChanged.bind(this));

		hide = !SpotifyWrapper.isSpotifyOpen();
		if (!hide) {
			// Only enable properties watching if Spotify is open to avoid errors
			SpotifyWrapper.connectPropertiesWatcher();
		}
	}

	disable() {
		settings.disconnect(onLeftPaddingChanged);
		settings.disconnect(onRightPaddingChanged);
		settings.disconnect(onExtensionPlaceChanged);
		settings.disconnect(onExtensionIndexChanged);

		settings.disconnect(onPrevIconColorChanged);
		settings.disconnect(onNextIconColorChanged);
		settings.disconnect(onPauseIconColorChanged);
		settings.disconnect(onPlayIconColorChanged);

		SpotifyWrapper.unwatchProcess(this.watchId);
		SpotifyWrapper.disconnectPropertiesWatcher();

		this.controlBar.destroy();
		this.controlBar = null;
		hide = true;
	}

	// Called when Spotify app opens
	_onSpotifyOpen() {
		hide = false;
		enableControls = true;
		// Enable watching properties like playback status changed
		SpotifyWrapper.connectPropertiesWatcher();
		this.onExtensionLocationChanged(settings);
	}

	// Called when Spotify app closes
	_onSpotifyClose() {
		hide = true;

		SpotifyWrapper.disconnectPropertiesWatcher();
		
		const newShowInactive = settings.get_boolean('show-inactive');

		if (newShowInactive !== showInactive) {
			showInactive = newShowInactive;
			this.onExtensionLocationChanged(settings);
		}
		
		if(!showInactive) {
			var removePanel = getPanel(lastExtensionPlace);
			this.controlBar.removeFrom(removePanel);
		}
		else {
			// If showing inactive, set play icon
			this.controlBar.toggle._playIcon();
		}

		enableControls = false;
	}

	// Called when the song changes
	_onSongChanged(_, song) {
		if (this.controlBar.songMenu && !hide) {
			this.controlBar.songMenu.updateSong(song);
		}
	}

	// Called when the playback status changes
	_updatePlayIcon(_, playing) {
		if (!hide) {
			if (playing) {
				this.controlBar.toggle._pauseIcon();
			} else {
				this.controlBar.toggle._playIcon();
			}
		}
	}

	_onShowInactiveChange(settings, key) {
		let newInactive = settings.get_boolean("show-inactive");
		if (!SpotifyWrapper.isSpotifyOpen()) {
			if (newInactive && !showInactive) {
				const newExtensionPlace = settings.get_string('extension-place');
				const newExtensionIndex = settings.get_int('extension-index');
				var insertBox = getPanel(newExtensionPlace);
				this.controlBar.insertAt(insertBox, newExtensionIndex);
			}
			else if (!newInactive && showInactive) {
				var removePanel = getPanel(lastExtensionPlace);
				this.controlBar.removeFrom(removePanel);
			}
		}
		showInactive = newInactive;
	}

	// Remove from old box & move to new box
	// USE THIS FOR ADDING TO TOP BAR
	onExtensionLocationChanged (settings, key) {
		const newExtensionPlace = settings.get_string('extension-place');
		const newExtensionIndex = settings.get_int('extension-index');

		var removeBox = getPanel(lastExtensionPlace);
		var insertBox = getPanel(newExtensionPlace);
		try {
			this.controlBar.removeFrom(removeBox);
			if (!hide || showInactive) {
				this.controlBar.insertAt(insertBox, newExtensionIndex);
			}
		} catch(err) {
			log(`Error: ${err}`);
		}

		lastExtensionPlace = newExtensionPlace;
		lastExtensionIndex = newExtensionIndex;
	}
}

function getPanel(place) {
	switch (place) {
		case 'left':
			return Main.panel._leftBox;
		case 'center':
			return Main.panel._centerBox;
		default:
			return Main.panel._rightBox;
	}
}

function debug(text) {
	log(`\n\n\n${text}\n\n\n`);
}

function init() {
	return new Extension();
}
