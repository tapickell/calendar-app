    const {remote, shell, ipcRenderer} = require('electron');
    const fs = require('fs');
    var app = remote.app;
    var renderer = ipcRenderer;
    var webview;
    var reminders;

    function findText() {
      var text = $('#find-text').val();
      if (text && text.length > 0) {
        webview.send('find', text);
      }
    }

    function toggleFindPane() {
      $('#find-pane').toggle();
      $('#find-text').focus();
    }


    onload = function() {

      webview = document.getElementById('gcalendar-web-view');
      reminders = $('#reminders-pane');

      webview.addEventListener('console-message', function(e) {
        console.log('google-calendar: ', e.message);
      });

      webview.addEventListener('new-window', function(e) {
        e.preventDefault();
        var url = e.url;
        if (url.indexOf('https://accounts.google.com/AddSession') === 0) {
          webview.src = url;
          return;
        }

        if (url.indexOf('https://calendar.google.com/calendar/') === 0) {
          return;
        }

        if (url.charAt(0) == '?') {
          url = 'https://calendar.google.com/calendar/' + url;
        }
        shell.openExternal(url);
      });

      webview.addEventListener('ipc-message', function(e) {
        console.log('ipc: ' + e.channel + ': ' + e.args);
        if (e.channel === 'reminder') {
          var buttonId = 'notification'+Date.now();
          var alertPrefix =
              '<div class="alert alert-info alert-dismissible" role="alert" style="box-shadow: 2px 2px 2px 0px rgba(0,0,0,0.65);border-color:grey">' +
              '<button id="'+ buttonId + '" type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><strong>'
          var alertPostfix = '</strong></div>';
          reminders.append(alertPrefix+e.args[0]+alertPostfix);
          $('#'+buttonId).click(function() {
            setTimeout(function() {
              if (reminders.children().length === 0)
                renderer.send('reminder-dismiss');
            }, 200);
          });
        }
      });

      webview.addEventListener('dom-ready', function() {
        function hookupBase() {
          var renderer = require('electron').ipcRenderer;
          var origNotif = window.Notification;

          window.Notification = function() {
            renderer.send('reminder');
            renderer.sendToHost('reminder', arguments[0]);
            return new origNotif(arguments[0], (arguments.length > 1 ? arguments[1] : undefined));
          };

          window.alert = function() {
            new Notification(arguments[0]);
          };

        }
        webview.executeJavaScript('(' + hookupBase.toString() + ')();');
      });

    }

