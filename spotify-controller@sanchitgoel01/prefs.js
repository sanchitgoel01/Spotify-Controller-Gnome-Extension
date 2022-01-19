const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const settings = (function() {  // basically copied from ExtensionUtils.getCurrentExtension() in recent Gnome Shell versions
    const GioSSS = Gio.SettingsSchemaSource;

    // Load schema
    let schemaSource = GioSSS.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        GioSSS.get_default(),
        false
    );

    let schemaObj = schemaSource.lookup(
        'org.gnome.shell.extensions.spotify-controller',
        true
    );

    if (!schemaObj)
        throw new Error(`Schema could not be found for extension ${Me.metadata.uuid}. Please check your installation`);

    // Load settings from schema
    return new Gio.Settings({ settings_schema: schemaObj });
})();


var extensionPlaceComboBox;

var prevColorButton, nextColorButton, pauseColorButton, playColorButton;


function init() {
}

function buildPrefsWidget() {

    let provider = new Gtk.CssProvider();
    provider.load_from_path(Me.dir.get_path() + '/prefs.css');
    Gtk.StyleContext.add_provider_for_display(
        Gdk.Display.get_default(),
        provider,
        Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

    let box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 1,
        css_classes: [ 'pref-box' ]
    });

    let prefsWidget = new Gtk.Grid({
        css_classes: ['prefs-widget'],
        column_spacing: 12,
        row_spacing: 12,
        visible: true,
        column_homogeneous: true,
    });
    box.append(prefsWidget);

    let index = 0;

	/* left-padding */
    let leftPaddingLabel = new Gtk.Label({
        label: 'Left padding:',
        css_classes: ['pref-label'],
        halign: Gtk.Align.START,
        visible: true
    });

    let leftPaddingEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 200,
            step_increment: 1
        }),
        hexpand: false,
        visible: true
    });

    prefsWidget.attach(leftPaddingLabel, 0, index, 1, 1);
    prefsWidget.attach(leftPaddingEntry, 1, index, 1, 1);


    /* right-padding */
    let rightPaddingLabel = new Gtk.Label({
        label: 'Right padding:',
        css_classes: ['pref-label'],
        halign: Gtk.Align.START,
        visible: true
    });

    let rightPaddingEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 200,
            step_increment: 1
        }),
        hexpand: false,
        visible: true
    });

    index++;
    prefsWidget.attach(rightPaddingLabel, 0, index, 1, 1);
    prefsWidget.attach(rightPaddingEntry, 1, index, 1, 1);


    // TODO: fix update time
    /* update-time */
    /*let updateTimeLabel = new Gtk.Label({
        label: 'Check Spotify settings every: (seconds)',
        halign: Gtk.Align.START,
        visible: true
    });

    let updateTimeEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 1,
            upper: 60,
            step_increment: 1
        }),
        visible: true
    });

    index++;
    prefsWidget.attach(updateTimeLabel, 0, index, 1, 1);
    prefsWidget.attach(updateTimeEntry, 1, index, 1, 1);
    */


    /* extension-place */
    let extensionPlaceLabel = new Gtk.Label({
        label: 'Extension Location:',
        css_classes: ['pref-label'],
        halign: Gtk.Align.START,
        visible: true
    });

	let options = ['left', 'center', 'right'];
    extensionPlaceComboBox = new Gtk.ComboBoxText({
    	halign: Gtk.Align.END,
    	visible: true
    });
    options.forEach(opt => extensionPlaceComboBox.append(opt, opt));
    extensionPlaceComboBox.set_active(options.indexOf(settings.get_string('extension-place')));

    index++;
    prefsWidget.attach(extensionPlaceLabel, 0, index, 1, 1);
    prefsWidget.attach(extensionPlaceComboBox, 1, index, 1, 1);


    /* extension-index */
    let extensionIndexLabel = new Gtk.Label({
        label: 'Extension Index',
        css_classes: ['pref-label'],
        halign: Gtk.Align.START,
        visible: true
    });

    let extensionIndexEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 20,
            step_increment: 1,
        }),
        hexpand: false,
        visible: true
    });

    index++;
    prefsWidget.attach(extensionIndexLabel, 0, index, 1, 1);
    prefsWidget.attach(extensionIndexEntry, 1, index, 1, 1);


    /* show-inactive */
    let showInactiveLabel = new Gtk.Label({
        label: 'Show when Spotify is closed:',
        css_classes: ['pref-label'],
        halign: Gtk.Align.START,
        visible: true
    });

    let showInactiveSwitch = new Gtk.Switch({
        valign: Gtk.Align.END,
        halign: Gtk.Align.END,
        visible: true
    });

    index++;
    prefsWidget.attach(showInactiveLabel, 0, index, 1, 1);
    prefsWidget.attach(showInactiveSwitch, 1, index, 1, 1);

    /* show song */
    let showSongLabel = new Gtk.Label({
        label: 'Show Song: ',
        css_classes: ['pref-label'],
        halign: Gtk.Align.START,
        visible: true
    });

    let showSongSwitch = new Gtk.Switch({
        valign: Gtk.Align.END,
        halign: Gtk.Align.END,
        visible: true
    });

    index++;
    prefsWidget.attach(showSongLabel, 0, index, 1, 1);
    prefsWidget.attach(showSongSwitch, 1, index, 1, 1);

    /* *-icon-color */
    let colorGrid = buildColorGrid();
    index++;
    prefsWidget.attach(colorGrid, 0, index, 1, 1);


    settings.bind('left-padding', leftPaddingEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    settings.bind('right-padding', rightPaddingEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    //settings.bind('update-time', updateTimeEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    extensionPlaceComboBox.connect('changed', Lang.bind(this, function(widget) {
        settings.set_string('extension-place', options[widget.get_active()]);
    }));
    settings.bind('extension-index', extensionIndexEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    settings.bind('show-inactive', showInactiveSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    settings.bind('show-song', showSongSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);


    let defaultButton = buildDefaultButton();
    box.append(defaultButton);

    return box;
}

function buildColorGrid() {

    let colorGrid = new Gtk.Grid({
        css_classes: [ 'color-grid' ],
        column_spacing: 12,
        row_spacing: 12,
        visible: true,
        column_homogeneous: true,
    });


    /* prev-icon-color */
    let prevColorLabel = new Gtk.Label({
        label: 'Previous Icon color:',
        halign: Gtk.Align.START,
        visible: true,
    });
    
    prevColorButton = new Gtk.ColorButton({
        visible: true,
    });
    let prevBtnColor = new Gdk.RGBA();
    prevBtnColor.parse(settings.get_string('prev-icon-color'));
    prevColorButton.set_rgba(prevBtnColor);

    colorGrid.attach(prevColorLabel, 0, 0, 1, 1);
    colorGrid.attach(prevColorButton, 1, 0, 1, 1);


    /* next-icon-color */
    let nextColorLabel = new Gtk.Label({
        label: 'Next Icon color:',
        halign: Gtk.Align.START,
        visible: true,
    });

    nextColorButton = new Gtk.ColorButton({
        visible: true,
    });
    let nextBtnColor = new Gdk.RGBA();
    nextBtnColor.parse(settings.get_string('next-icon-color'));
    nextColorButton.set_rgba(nextBtnColor);

    colorGrid.attach(nextColorLabel, 0, 1, 1, 1);
    colorGrid.attach(nextColorButton, 1, 1, 1, 1);


    /* pause-icon-color */
    let pauseColorLabel = new Gtk.Label({
        label: 'Pause Icon color:',
        halign: Gtk.Align.START,
        visible: true,
    });

    let pauseBtnColor = new Gdk.RGBA();
    pauseBtnColor.parse(settings.get_string('pause-icon-color'));

    pauseColorButton = Gtk.ColorButton.new_with_rgba(pauseBtnColor);

    colorGrid.attach(pauseColorLabel, 0, 2, 1, 1);
    colorGrid.attach(pauseColorButton, 1, 2, 1, 1);


    /* play-icon-color */
    let playColorLabel = new Gtk.Label({
        label: 'Play Icon color:',
        halign: Gtk.Align.START,
        visible: true,
    });

    let playBtnColor = new Gdk.RGBA();
    playBtnColor.parse(settings.get_string('play-icon-color'));
    playColorButton = Gtk.ColorButton.new_with_rgba(playBtnColor);

    colorGrid.attach(playColorLabel, 0, 3, 1, 1);
    colorGrid.attach(playColorButton, 1, 3, 1, 1);


    prevColorButton.connect('color-set', Lang.bind(this, function(widget) {
        const color = widget.get_rgba().to_string();
        settings.set_string('prev-icon-color', color);
    }));

    nextColorButton.connect('color-set', Lang.bind(this, function(widget) {
        const color = widget.get_rgba().to_string();
        settings.set_string('next-icon-color', color);
    }));

    pauseColorButton.connect('color-set', Lang.bind(this, function(widget) {
        const color = widget.get_rgba().to_string();
        settings.set_string('pause-icon-color', color);
    }));

    playColorButton.connect('color-set', Lang.bind(this, function(widget) {
        const color = widget.get_rgba().to_string();
        settings.set_string('play-icon-color', color);
    }));


    return colorGrid;
}

// Convert rgba to hex string
function rgbaToHex(color) {
    var a,
    rgb = orig.replace(/\s/g, '').match(/^rgba?\((\d+),(\d+),(\d+),?([^,\s)]+)?/i),
    alpha = (rgb && rgb[4] || "").trim(),
    hex = rgb ?
    (rgb[1] | 1 << 8).toString(16).slice(1) +
    (rgb[2] | 1 << 8).toString(16).slice(1) +
    (rgb[3] | 1 << 8).toString(16).slice(1) : orig;

  if (alpha !== "") {
    a = alpha;
  } else {
    a = 01;
  }
  // multiply before convert to HEX
  a = ((a * 255) | 1 << 8).toString(16).slice(1)
  hex = hex + a;

  return hex;
}

function buildDefaultButton() {
    let button = new Gtk.Button({
        label: "Reset to default",
    });

    button.connect('clicked', function() {
        settings.set_int('left-padding', 0);
        settings.set_int('right-padding', 0);

        extensionPlaceComboBox.set_active(1);   // center
        settings.set_int('extension-index', 0);

        settings.set_boolean('show-inactive', false);

        const white = new Gdk.RGBA();
        white.parse('white');

        prevColorButton.set_rgba(white); prevColorButton.emit('color-set');
        nextColorButton.set_rgba(white); nextColorButton.emit('color-set');
        pauseColorButton.set_rgba(white); pauseColorButton.emit('color-set');
        playColorButton.set_rgba(white); playColorButton.emit('color-set');
    });

    return button;
}
