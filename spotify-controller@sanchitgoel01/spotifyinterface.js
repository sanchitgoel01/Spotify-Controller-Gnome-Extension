const { Gio } = imports.gi;
const Signals = imports.signals;

const _SpotifyRemoteDataInterface = `<node>\
<interface name="org.freedesktop.DBus.Properties"> \
  <method name="Get"> \
	<arg type="s" name="interface_name" direction="in"/> \
	<arg type="s" name="property_name" direction="in"/> \
	<arg type="v" name="value" direction="out"/> \
  </method> \
  <method name="GetAll"> \
	<arg type="s" name="interface_name" direction="in"/>
	<arg type="a{sv}" name="properties" direction="out"/>
  </method> \
  <method name="Set"> \
	<arg type="s" name="interface_name" direction="in"/> \
	<arg type="s" name="property_name" direction="in"/> \
	<arg type="v" name="value" direction="in"/> \
  </method> \
  <signal name="PropertiesChanged"> \
	<arg type="s" name="interface_name"/> \
	<arg type="a{sv}" name="changed_properties"/> \
	<arg type="as" name="invalidated_properties"/> \
  </signal> \
</interface> \
</node>
`;

const _SpotifyInterface = `<node>\
<interface name="org.mpris.MediaPlayer2.Player"> \
  <method name="Next"/> \
  <method name="Previous"/> \
  <method name="Pause"/> \
  <method name="PlayPause"/> \
  <method name="Stop"/> \
  <method name="Play"/> \
  <method name="Seek"> \
	<arg type="x" name="Offset" direction="in"/> \
  </method> \
  <method name="SetPosition">
	<arg type="o" name="TrackId" direction="in"/> \
	<arg type="x" name="Position" direction="in"/> \
  </method> \
  <method name="OpenUri"> \
	<arg type="s" name="Uri" direction="in"/> \
  </method> \
  <signal name="Seeked"> \
	<arg type="x" name="Position"/> \
  </signal> \
  <property type="s" name="PlaybackStatus" access="read"/> \
  <property type="s" name="LoopStatus" access="readwrite"/> \
  <property type="d" name="Rate" access="readwrite"/> \
  <property type="b" name="Shuffle" access="readwrite"/> \
  <property type="a{sv}" name="Metadata" access="read"/> \
  <property type="d" name="Volume" access="readwrite"/> \
  <property type="x" name="Position" access="read"/> \
  <property type="d" name="MinimumRate" access="read"/> \
  <property type="d" name="MaximumRate" access="read"/> \
  <property type="b" name="CanGoNext" access="read"/> \
  <property type="b" name="CanGoPrevious" access="read"/> \
  <property type="b" name="CanPlay" access="read"/> \
  <property type="b" name="CanPause" access="read"/> \
  <property type="b" name="CanSeek" access="read"/> \
  <property type="b" name="CanControl" access="read"/> \
</interface>
</node>
`;

const _SpotifyProxyWrapper = Gio.DBusProxy.makeProxyWrapper(_SpotifyInterface);

const _spotifyProxy = new _SpotifyProxyWrapper(
    Gio.DBus.session,
    "org.mpris.MediaPlayer2.spotify",
    "/org/mpris/MediaPlayer2"
);

// Play / Pause the current spotify track
function toggleTrack() {
    _spotifyProxy.PlayPauseRemote();
}

// Go to the next track on Spotify
function nextTrack() {
    _spotifyProxy.NextRemote();
}

// Go to the previous track on Spotify
function previousTrack() {
    _spotifyProxy.PreviousRemote();
}

const _SpotifyDataWrapper = Gio.DBusProxy.makeProxyWrapper(_SpotifyRemoteDataInterface);

const _spotifyDataProxy = new _SpotifyDataWrapper(
    Gio.DBus.session,
    "org.mpris.MediaPlayer2.spotify",
    "/org/mpris/MediaPlayer2"
);

function _getDataProperty(property) {
    return _spotifyDataProxy.GetSync("org.mpris.MediaPlayer2.Player", property);
}

/**
 * Check if the spotify application is open!
 * 
 * @returns {boolean} if spotify is open
 */
function isSpotifyOpen() {
    try {
      _getDataProperty("PlaybackStatus");
      return true;
    } catch (error) {
      return false;
    }
}

/**
 * Check if current track is playing on Spotify.
 * 
 * @throws an error if spotify isn't open
 * @returns {boolean} if current track is playing
 */
function isPlaying() {
    let resultV = _getDataProperty("PlaybackStatus");
    if (resultV) {
        let resultStr = resultV[0].unpack();
        return resultStr == "Playing";
    }
    log("spotify-controller error: Trying to get playback status when spotify isn't open!");
}

function _convertMetadataToSong(metadataObj) {
  let unpack = (property) => metadataObj[property].unpack().unpack();
  let songObj = {};

  /** @type {string} */
  songObj.title = unpack('xesam:title');
  /** @type {string} */
  songObj.album = unpack('xesam:album');
  /** @type {array} */
  songObj.artists = unpack('xesam:artist').map((artistPacked) => artistPacked.unpack());
  /** @type {string} */
  songObj.artUrl = unpack('mpris:artUrl');

  return songObj;
}

function getCurrentSong() {
  let metadata = _getDataProperty("Metadata")[0].unpack();
  return _convertMetadataToSong(metadata);
}

/**
 * Watch if the Spotify applications opens or close.
 * 
 * @param {function} onOpen Function to trigger on application open.
 * @param {function} onClose Function to trigger on application close.
 * @returns {number} watch id
 */
function watchProcess(onOpen, onClose) {
  return Gio.bus_watch_name(
    Gio.BusType.SESSION,
    'org.mpris.MediaPlayer2.spotify',
    Gio.BusNameWatcherFlags.NONE,
    onOpen,
    onClose
  );
}

/**
 * Unwatch Spotify monitoring
 * 
 * @param {number} watchId 
 */
function unwatchProcess(watchId) {
  Gio.bus_unwatch_name(watchId);
}

var propertiesWatcher = {};
Signals.addSignalMethods(propertiesWatcher);

_playbackStatusCached = null;
_songCached = {};

_handlerId = null;
function connectPropertiesWatcher() {
  if (isSpotifyOpen()) {
    let playing = isPlaying();
    if (playing != null && playing != _playbackStatusCached) {
      _playbackStatusCached = playing;
      propertiesWatcher.emit('changed:PlaybackStatus', playing);
    }

    let song = getCurrentSong();
    if (_songCached == null || song.title != _songCached.title) {
      _songCached = song;
      propertiesWatcher.emit('changed:Song', song);
    }
  }

  _handlerId = _spotifyDataProxy.connectSignal('PropertiesChanged', (proxy, nameOwner, args) => {
    let output = args[1];
    let playbackStatus = output.PlaybackStatus.unpack();
    let isPlaying = playbackStatus == "Playing";
    if (isPlaying != _playbackStatusCached) {
      _playbackStatusCached = isPlaying;
      propertiesWatcher.emit('changed:PlaybackStatus', isPlaying);
    }

    let metadata = output.Metadata.unpack();
    /** @type {string} */
    let song = _convertMetadataToSong(metadata);
    if (_songCached == null || song.title != _songCached.title) {
      _songCached = song;
      propertiesWatcher.emit('changed:Song', song);
    }
  });
}

function disconnectPropertiesWatcher() {
  if (_handlerId) {
    _spotifyDataProxy.disconnectSignal(_handlerId);
    _handlerId = null;
    _playbackStatusCached = null;
    _songCached = null;
  }
}
