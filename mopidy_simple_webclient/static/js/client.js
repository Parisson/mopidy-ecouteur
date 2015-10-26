/* Simple Mopidy web client for the Ecouteur project
 *
 * Author:Thomas Fillon <thomas@parisson.com>
  */


var mopidy = new Mopidy();             // Connect to server
mopidy.on(console.log.bind(console));  // Log all events
//mopidy.on("state:online", get_current_track);

mopidy.on("event:trackPlaybackStarted", function(data) {
  //console.log('data', data);
  update_track_info (data.tl_track);
  }
);
mopidy.on("event:playbackStateChanged", function(data) {
    if (data.new_state === 'playing') {
      updatePositionTimer = setInterval(function() {
        update_time_position();
      }, 1000);
    } else {
      if (typeof updatePositionTimer !== 'undefined') {
      clearInterval(updatePositionTimer);
    };
    }
});

// Ne marche pas a priori !!!!! ????
$('#previous-track-button').click(function() {  mopidy.playback.previous(); });
$('#next-track-button').click(function() { mopidy.playback.next(); });

var get = function (key, object) {
  console.log('object', object);
  console.log('key', key)
    return object[key];
};

var get_uris_from_playlist = function (playlist) {
    var uris = [];

    for (var track in playlist['tracks']) {
      uris.push(playlist['tracks'][track]['uri']);
    };

    return uris
};

var add_uris = function (uris) {
  console.log(mopidy.tracklist.add)
  return mopidy.tracklist.add(null, null, null, uris);
}


var printTypeAndName = function (model) {
    console.log(model.__model__ + ": " + model.name);
    // By returning the playlist, this function can be inserted
    // anywhere a model with a name is piped in the chain.
    return model;
};

var queueAndPlay = function (playlistNum, trackNum) {
    playlistNum = playlistNum || 0;
    trackNum = trackNum || 0;
    mopidy.playlists.getPlaylists()
        // => list of Playlists
        .fold(get, playlistNum)
        // => Playlist
        //.then(printTypeAndName)
        // => Playlist
        //.fold(get, 'tracks')
        .then(get_uris_from_playlist)
        //.then(printTypeAndName)
        // => list of Tracks
        .then(add_uris)
        // => list of TlTracks
        .fold(get, trackNum)
        // => TlTrack
        .then(mopidy.playback.play)
        // => null
        //.then(printNowPlaying)
        // => null
        .catch(console.error.bind(console))  // Handle errors here
        // => null
        .done();                       // ...or they'll be thrown here
};

mopidy.on("state:online", queueAndPlay);


function get_current_track() {
  mopidy.playback.getCurrentTlTrack().then(update_track_info);
};

function update_track_info (tl_track) {
  render_curent_track(tl_track.track);
  mopidy.tracklist.nextTrack(tl_track).then(set_next_track);
  mopidy.tracklist.previousTrack(tl_track).then(set_previous_track);
  //getTimePosition();
};

function set_next_track(next_track) {
  if (next_track !== null) {
    $('#label-next').html(short_track_info(next_track.track));
  };
};

function set_previous_track(previous_track) {
  if (previous_track !== null) {
    $('#label-previous').html(short_track_info(previous_track.track));
  };
};

function update_time_position() {
  mopidy.playback.getTimePosition().then(set_time_position)
        .catch(console.error.bind(console)) // Handle errors here
    .done();                            // ...or they'll be thrown here;
};

function set_time_position(time_position) {
  var bar_elapsed = $('#time-elapsed');
  var bar_remain = $('#time-remain');
  var track_length = bar_elapsed.attr('aria-valuemax');
  var track_position = time_position / 1000;
  var width = ( track_position / track_length) * 100;
  var track_remain = track_length - track_position;

  var elapsed_time = timeFromSeconds(track_position);
  var remain_time = timeFromSeconds(track_remain);


  bar_elapsed.css('width', width + '%');
  bar_remain.css('width', (100-width) + '%');
  bar_elapsed.attr('aria-valuenow', track_position);
  bar_remain.attr('aria-valuenow', track_remain);
  $('#label-bar-left').html('<h3>' + elapsed_time + '</h3>');
  $('#label-bar-right').html('<h3>' + remain_time + '</h3>');
};


// Initialize the Mopidy client after all resources have been loaded.
$(function() {
  mopidy_client = new MopidyClient();
});

// MopidyClient {{{1

function MopidyClient() {
  this.init();
  return this;
};

// MopidyClient.init() - Initialize the Mopidy client. {{{2

MopidyClient.prototype.init = function() {
  // Initialize a logging handler for structured logging messages.
  this.logger = new Logger();
  this.logger.info("Initializing Mopidy client ..");
  // Track the connection state.
  this.connected = false;
  // Use an incrementing integer to uniquely identify JSON RPC calls.
  this.id = 1;

  // Install global event handlers.
  this.install_event_handlers();
  // Ask the user which Mopidy server to connect to.
  this.select_server();
};



// MopidyClient.install_event_handlers() {{{2

MopidyClient.prototype.install_event_handlers = function() {
  var client = this;
  $('#select-server form').submit(function() { client.connect($('#server-url').val()); return false; });
  $('#play-button').click(function() { client.play(); });
  $('#pause-button').click(function() { client.pause(); });
  $('#stop-button').click(function() { client.stop(); });
  $('#previous-track-button').click(function() {  mopidy.playback.previous(); });
  $('#next-track-button').click(function() { mopidy.playback.next(); });
  $('#select-playlist-button').click(function() { client.select_playlist(); });
  $('#cancel-playlist-selection-button').click(function() { client.show_now_playing(); });
};

// MopidyClient.select_server() - Ask the user which Mopidy server to connect to. {{{2

MopidyClient.prototype.select_server = function() {
  // Pre fill the Mopidy server's base URL. This logic is intended to support
  // 1) Mopidy running on a separate domain and 2) Mopidy running on a specific
  // URL prefix.
  var url = document.location.href;
  // Remove fragment identifiers from the URL.
  url = url.replace(/#.*$/, '');
  // Remove an optional (redundant) filename from the URL.
  url = url.replace(/index\.html$/, '');
  // Remove the extension name from the URL.
  url = url.replace(/\/simple-webclient\/$/, '/');
  // Pre fill the form field.
  $('#server-url').val(url);
  // Try to connect automatically.
  this.logger.info("Trying to connect automatically ..");
  $('#select-server form').submit();
};

// MopidyClient.error_handler() {{{2

MopidyClient.prototype.error_handler = function(e) {
  this.logger.error("Exception handler called! (%s)", e);
  if (!this.connected) {
    this.show('select-server');
    $('#connect-error').html(sprintf("<strong>Error:</strong> Failed to connect to <code>%s</code>", this.base_url));
  } else {
    $('#runtime-error').html(sprintf("<strong>Warning:</strong> Encountered unhandled error! (review the console log for details)"));
    $('#runtime-error').show();
    console.log(e);
  }
};

// MopidyClient.connect() - Connect to the Mopidy server. {{{2

MopidyClient.prototype.connect = function(base_url) {
  // Store the Mopidy server base URL.
  this.base_url = base_url;
  // If the user entered a URL without a scheme we'll default to the http:// scheme.
  if (!this.base_url.match(/^\w+:/))
    this.base_url = 'http://' + this.base_url;
  this.logger.debug("Mopidy server base URL is " + this.base_url);
  // Concatenate the base URL and the /mopidy/rpc/ path.
  this.rpc_url = this.base_url.replace(/\/*$/, '/mopidy/rpc');
  this.logger.debug("Mopidy server RPC URL is " + this.rpc_url);
  // Switch to the `now playing' interface.
  this.show_now_playing();
};

// MopidyClient.show_now_playing() {{{2

MopidyClient.prototype.show_now_playing = function() {
  this.show('now-playing');
  //this.refresh_gui();
};


// MopidyClient.select_playlist() - Ask the user which play list to load. {{{2

MopidyClient.prototype.select_playlist = function() {
  // Show the play list selection interface.
  $('#available-playlists').hide();
  $('#no-playlists-message').hide();
  this.show('select-playlist');
  $('#loading-playlists-spinner').show();
  // Fetch the available play lists from the server.
  this.call('core.playlists.get_playlists', function(playlists) {
    this.logger.info("Found %i play lists.", playlists.length);
    var labels = [];
    for (var i = 0; i < playlists.length; i++) {
      var name = playlists[i].name;
      var size = playlists[i].tracks ? playlists[i].tracks.length : 0;
      var classes = 'btn btn-large';
      if (name == 'Starred')
        classes += ' btn-primary';
      var onclick = sprintf('mopidy_client.load_playlist(%s)', JSON.stringify(name));
      labels.push(sprintf('<button class="%s" onclick="%s">%s (%i tracks)</button>',
                          classes, html_encode(onclick), html_encode(name), size));
    }
    if (labels.length > 0) {
      $('#loading-playlists-spinner').hide();
      $('#available-playlists').html(labels.join('\n'));
      $('#available-playlists').show();
    } else {
      $('#loading-playlists-spinner').hide();
      $('#available-playlists').hide();
      $('#no-playlists-message').show();
    }
  });
};

// MopidyClient.load_playlist() - Load the selected play list. {{{2

MopidyClient.prototype.load_playlist = function(name) {
  // Fetch the available play lists from the server.
  this.call('core.playlists.get_playlists', function(playlists) {
    for (var i = 0; i < playlists.length; i++) {
      var playlist = playlists[i];
      // Match the selected play list by name.
      if (playlist.name == name) {
        // Clear all existing tracks from the track list.
        this.logger.debug("Clearing track list ..");
        this.call('core.tracklist.clear', function() {
          this.logger.debug("Adding tracks to track list ..");
          this.call({
            method: 'core.tracklist.add',
            params: [playlist.tracks],
            done: function() {
              this.call('core.playback.play', function() {
                this.show_now_playing();
              });
            }
          });
        });
        // Stop looking, we found the relevant play list.
        break;
      }
    }
  });
};

function render_curent_track(current_track) {
  // Render the "$track from $album by $artist" text.
  var now_playing = [];
  now_playing.push('<h3>Auteur :</h3>')
  if (current_track.artists) {
    var artists = [];
    for (var i = 0; i < current_track.artists.length; i++) {
      var artist_name = (current_track.artists[i]).name;
      artists.push(sprintf('<h2 class="artist-name">%s</h2>', artist_name));
    }
    now_playing.push('<span class="by-artist"></span>');
    now_playing.push(sprintf('%s', artists.join(', ')));
  }
  now_playing.push('<h3>Titre de l&apos;&oelig;uvre :</h3>')
  now_playing.push(sprintf('<h2 class="track-name">%s</h2><br>', current_track.name));

  $('#track-info').html(now_playing.join('\n'));


  // Render extra track info
  var now_playing_extra = [];

  if (current_track.date) {
    now_playing_extra.push(sprintf('<span class="album-year">Année : %s</span><br>', current_track.date.slice(0,4)));
  }

  if (current_track.length) {
    var track_length = current_track.length / 1000;
    $('#time-elapsed').attr('aria-valuemax', track_length);
    $('#time-left').attr('aria-valuemax', track_length);

    now_playing_extra.push(sprintf('<span class="album-length">Durée de l&apos;&oelig;uvre : %s</span><br>', timeFromSeconds(track_length)));
  }
  if (current_track.album && current_track.album.name != 'Unknown') {
    now_playing_extra.push(sprintf('<p class="album-name">%s</p><br>', current_track.album.name));
  }
  $('#track-extra-info').html(now_playing_extra.join('\n'));

  // Render extra track info -> Comments
  var now_playing_comment = [];
  if (current_track.comment) {
    now_playing_comment.push(sprintf('<p class="trck-comment">%s</p><br>',
                             current_track.comment));
  }
  $('#track-comment').html(now_playing_comment.join('\n'));


};

// short format for trac info
function short_track_info(track) {
  if (track) {
    var info = '';
    if (track.artists) {
        info += track.artists[0].name;
    };
    if (track.name) {
      info += ' ' + track.name;
    };
    if (track.date) {
        info += ' (' + track.date.slice(0,4) + ')';
    };
    return info;
  };

};



// MopidyClient.show() - Bring the given interface to the front. {{{2

MopidyClient.prototype.show = function(element_id) {
  this.logger.info("Showing element with ID %s ..", element_id);
  $('.hidden-by-default').hide(0, function() {
    $(sprintf('#%s', element_id)).show(0);
  });
  document.location.href = sprintf('#%s', element_id);
};



// MopidyClient.call() - Call Mopidy API methods using JSON RPC. {{{2

MopidyClient.prototype.call = function() {
  // Unpack the arguments.
  if (arguments.length == 2) {
    var method = arguments[0];
    var params = [];
    var callback = arguments[1];
  } else {
    var settings = arguments[0];
    var method = settings.method;
    var params = settings.params || [];
    var callback = settings.done;
  }
  // Generate a unique id for this call.
  var request_id = this.id;
  this.id += 1;
  // Generate the JSON request body.
  var request_body = JSON.stringify({
    jsonrpc: '2.0',
    method: method,
    params: params,
    id: request_id
  });
  this.logger.debug("Generated request body: %s", request_body);
  // Make the call.
  this.logger.debug("Sending request ..");
  jQuery.ajax({
    url: this.rpc_url,
    type: 'POST',
    data: request_body
  }).done(function(data) {
    mopidy_client.connected = true;
    if (data.error) {
      console.log(data);
      throw "Mopidy API reported error: " + data.error.data;
    } else if (data.id != request_id) {
      throw "Response id " + data.id + " doesn't match request id " + request_id + "!";
    }
    if (callback)
      jQuery.proxy(callback, mopidy_client)(data.result);
  }).error(function(e) {
    mopidy_client.error_handler(e);
  });
};

// Logger {{{1

function Logger() {
  return this;
};

// Logger.log() {{{2

Logger.prototype.log = function(severity, args) {
  // Get the current date and time.
  var now = new Date();
  var timestamp = sprintf(
    '%i-%02d-%02d %02d:%02d:%02d',
    now.getFullYear(), now.getMonth(), now.getDate(),
    now.getHours(), now.getMinutes(), now.getSeconds()
  );
  // Render the log message.
  var message = sprintf.apply(null, args);
  console.log(timestamp + ' ' + severity + ' ' + message);
};

// Logger.error() {{{2

Logger.prototype.error = function() {
  this.log('ERROR', arguments);
};

// Logger.warning() {{{2

Logger.prototype.warning = function() {
  this.log('WARN', arguments);
};

// Logger.info() {{{2

Logger.prototype.info = function() {
  this.log('INFO', arguments);
};

// Logger.debug() {{{2

Logger.prototype.debug = function() {
  this.log('DEBUG', arguments);
};

// Miscellaneous functions. {{{1

// html_encode(string) {{{2

function html_encode(string) {
    return string.replace(/&/g, '&amp;')
                 .replace(/"/g, '&quot;')
                 .replace(/'/g, '&#39;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;');
};

//convert time to human readable format
function timeFromSeconds(length) {
    var d = Number(length);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);
    return ((h > 0 ? h + "h" : "") + (m > 0 ? (h > 0 && m < 10 ? "0" : "") + m + "'" : "0'") + (s < 10 ? "0" : "") + s);
}
