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
  init_state(data.new_state);
});

function init_state (state) {
  if (state === 'playing') {
    show_now_playing();
    updatePositionTimer = setInterval(function() {
      update_time_position();
    }, 1000);
  } else {

    if (typeof updatePositionTimer !== 'undefined') {
    clearInterval(updatePositionTimer);
    };
    if (state === 'stopped') {
        select_playlist();
    }
  }
};


// Assign event handlers
$(document).ready(
    function() {
      $('#previous-track-button').click(function() {  mopidy.playback.previous(); });
      $('#next-track-button').click(function() { mopidy.playback.next(); });
      $('#select-playlist-button').click(function() { select_playlist(); });
    }
  );

var get = function (key, object) {
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

mopidy.on("state:online", function () {
  mopidy.playback.getState().then(init_state);
});


function get_current_track() {
  mopidy.playback.getCurrentTlTrack().then(update_track_info);
};

function update_track_info (tl_track) {
  if (tl_track !== null) {
    render_curent_track(tl_track.track);
    mopidy.tracklist.nextTrack(tl_track).then(set_next_track);
    mopidy.tracklist.previousTrack(tl_track).then(set_previous_track);
  };
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

  var min_width = parseFloat($(".progress-bar").css('min-width'));
  var max_width = parseFloat($(".progress-bar").css('max-width'));

  var width = min_width + ( track_position / track_length) * (max_width - min_width) ;
  var track_remain = track_length - track_position;

  var elapsed_time = timeFromSeconds(track_position);
  var remain_time = timeFromSeconds(track_remain);


  bar_elapsed.css('width', width + '%');
  bar_remain.css('width', (100-width) + '%');
  bar_elapsed.attr('aria-valuenow', track_position);
  bar_remain.attr('aria-valuenow', track_remain);
  $('#label-bar-left').html('<h3>' + elapsed_time + '</h3>');
  $('#label-bar-right').html('<h3> -' + remain_time + '</h3>');
};

function select_playlist() {
  $('#available-playlists').hide();
  $('#no-playlists-message').hide();
  $('#select-playlist').show();
  $('#loading-playlists-spinner').show();
  $('#now-playing').hide();
  // Fetch the available play lists from the server.
  mopidy.playlists.getPlaylists()
  .then(function(playlists) {
    var labels = [];
    for (var i = 0; i < playlists.length; i++) {
      var name = playlists[i].name;
      var size = playlists[i].tracks ? playlists[i].tracks.length : 0;
      var classes = 'btn btn-large';
      if (name == 'Starred')
        classes += ' btn-primary';
      var onclick = sprintf('load_playlist(%s)', i);
      labels.push(sprintf('<button class="%s" onclick="%s">%s (%i pistes)</button>',
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

function load_playlist(playlist_id) {
  // Fetch the available play lists from the server.
  mopidy.playlists.getPlaylists()
  .fold(get, playlist_id)
  .then(function(playlist) {
    // Clear all existing tracks from the track list.
    mopidy.tracklist.clear()
    // Adding tracks to track list
    add_uris(get_uris_from_playlist(playlist));
    // Play !
    mopidy.playback.play();
    //this.show_now_playing();
    // Switch to the `now playing' interface.
    show_now_playing();

  });

};

function show_now_playing() {

    get_current_track();

    $('#available-playlists').hide();
    $('#no-playlists-message').hide();
    $('#select-playlist').hide();
    $('#loading-playlists-spinner').hide();
    $('#now-playing').show();
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
