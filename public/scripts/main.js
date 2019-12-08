/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

// サインイン時の処理
const signIn = () => {
  let provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider);
}

// サインアウト時の処理
const signOut = () => {
  firebase.auth().signOut();
}

// 認証情報の確認　このjsを読み込んだときに発火
const initFirebaseAuth = () => {
  firebase.auth().onAuthStateChanged(authStateObserver);
}

// プロフィールURLを返す
const getProfilePicUrl = () => {
  return firebase.auth().currentUser.photoURL || '/image/profile_placeholder.png'
}

// ユーザーネームを返す
const getUserName = () => {
  return firebase.auth().currentUser.displayName;
}

// messagesにデータを入れる
const saveMessage = (messageText) => {
  return firebase.firestore().collection('messages').add({
    name: getUserName(),
    text: messageText,
    profilePicUrl: getProfilePicUrl(),
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).catch((error) => {
    console.error('Error writing new message to database', error);
  });
}

// DBにあるデータを読み込み、関数displayMessageに渡す
const loadMessages = () => {
  let query = firebase.firestore()
    .collection('messages')
    .orderBy('timestamp', 'desc')
    .limit(20);

  query.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'removed') {
        deleteMessage(change.doc.id);
      } else {
        let message = change.doc.data();
        displayMessage(change.doc.id, message.timestamp, message.name,
          message.text, message.profilePicUrl, message.imageUrl)
      }
    });
  });
}

// 画像を保存するはずですがブラックボックス。。。
const saveImageMessage = (file) => {
  firebase.firestore().collection('messages').add({
    name: getUserName(),
    imageUrl: 'https://www.google.com/images/spin-32.gif?a',
    profilePicUrl: getProfilePicUrl(),
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then((messageRef) => {
    let filePath = firebase.auth().currentUser.uid+'/'+messageRef.id+'/'+file.name;
    return firebase.storage().ref(filePath).put(file).then((fileSnapshot) => {
      return fileSnapshot.ref.getDownloadURL().then((url)=>{
        return messageRef.update({
          imageUrl: url,
          storageUri: fileSnapshot.metadata.fullPath
        });
      });
    });
  }).catch((error) => {
    console.error('There was an error uploading a file to Cloud Strage:', error)
  })
}

// 下の画像ボタンを押した時に発動
const onMediaFileSelected = (event) => {
  event.preventDefault();
  let file = event.target.files[0];
  imageFormElement.reset();
  
  if (!file.type.match('image.*')) {
    let data = {
      message: '画像のみアップロードできます',
      timeout: 2000
    };
    signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
    return;
  }
  // サインインしてるかのチェック
  if (checkSignedInWithMessage()) {
    saveImageMessage(file);
  }
}

// 送信ボタンを押した時発火
const onMessageFormSubmit = (e) => {
  e.preventDefault();
  if (messageInputElement.value && checkSignedInWithMessage()) {
    saveMessage(messageInputElement.value).then(() => {
      resetMaterialTextfield(messageInputElement);
      toggleButton();
    });
  }
}

// Triggers when the auth state change for instance when the user signs-in or signs-out.
function authStateObserver(user) {
  if (user) { // User is signed in!
    // Get the signed-in user's profile pic and name.
    var profilePicUrl = getProfilePicUrl();
    var userName = getUserName();

    // Set the user's profile pic and name.
    userPicElement.style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(profilePicUrl) + ')';
    userNameElement.textContent = userName;

    // Show user's profile and sign-out button.
    userNameElement.removeAttribute('hidden');
    userPicElement.removeAttribute('hidden');
    signOutButtonElement.removeAttribute('hidden');

    // Hide sign-in button.
    signInButtonElement.setAttribute('hidden', 'true');

  } else { // User is signed out!
    // Hide user's profile and sign-out button.
    userNameElement.setAttribute('hidden', 'true');
    userPicElement.setAttribute('hidden', 'true');
    signOutButtonElement.setAttribute('hidden', 'true');

    // Show sign-in button.
    signInButtonElement.removeAttribute('hidden');
  }
}

// サインインをしてればtrueを返す、してなければ注意してfalseを返す
const checkSignedInWithMessage = () => {
  if (!!firebase.auth().currentUser) {
    return true;
  }
  let data = {
    message: 'いずれかの動物でログインして下さい',
    timeout: 2000
  };
  signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
  return false;
}

// Resets the given MaterialTextField.
function resetMaterialTextfield(element) {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
}

// Template for messages.
var MESSAGE_TEMPLATE =
  '<div class="message-container">' +
  '<div class="spacing"><div class="pic"></div></div>' +
  '<div class="message"></div>' +
  '<div class="name"></div>' +
  '</div>';

// Adds a size to Google Profile pics URLs.
function addSizeToGoogleProfilePic(url) {
  if (url.indexOf('googleusercontent.com') !== -1 && url.indexOf('?') === -1) {
    return url + '?sz=150';
  }
  return url;
}

// Delete a Message from the UI.
function deleteMessage(id) {
  var div = document.getElementById(id);
  // If an element for that message exists we delete it.
  if (div) {
    div.parentNode.removeChild(div);
  }
}

function createAndInsertMessage(id, timestamp) {
  const container = document.createElement('div');
  container.innerHTML = MESSAGE_TEMPLATE;
  const div = container.firstChild;
  div.setAttribute('id', id);

  // If timestamp is null, assume we've gotten a brand new message.
  // https://stackoverflow.com/a/47781432/4816918
  timestamp = timestamp ? timestamp.toMillis() : Date.now();
  div.setAttribute('timestamp', timestamp);

  // figure out where to insert new message
  const existingMessages = messageListElement.children;
  if (existingMessages.length === 0) {
    messageListElement.appendChild(div);
  } else {
    let messageListNode = existingMessages[0];

    while (messageListNode) {
      const messageListNodeTime = messageListNode.getAttribute('timestamp');

      if (!messageListNodeTime) {
        throw new Error(
          `Child ${messageListNode.id} has no 'timestamp' attribute`
        );
      }

      if (messageListNodeTime > timestamp) {
        break;
      }

      messageListNode = messageListNode.nextSibling;
    }

    messageListElement.insertBefore(div, messageListNode);
  }

  return div;
}


function displayMessage(id, timestamp, name, text, picUrl, imageUrl) {
  var div = document.getElementById(id) || createAndInsertMessage(id, timestamp);

  // profile picture
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(picUrl) + ')';
  }

  div.querySelector('.name').textContent = name;
  var messageElement = div.querySelector('.message');

  if (text) { // If the message is text.
    messageElement.textContent = text;
    // Replace all line breaks by <br>.
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
  } else if (imageUrl) { // If the message is an image.
    var image = document.createElement('img');
    image.addEventListener('load', function () {
      messageListElement.scrollTop = messageListElement.scrollHeight;
    });
    image.src = imageUrl + '&' + new Date().getTime();
    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
  // Show the card fading-in and scroll to view the new message.
  setTimeout(function () { div.classList.add('visible') }, 1);
  messageListElement.scrollTop = messageListElement.scrollHeight;
  messageInputElement.focus();
}

const toggleButton = () => {
  if (messageInputElement.value) {
    submitButtonElement.removeAttribute('disabled');
  } else {
    submitButtonElement.setAttribute('disabled', 'true');
  }
}

// 以下便利だし分かりやすいし、変えるの面倒なのでほぼそのまま
// Shortcuts to DOM Elements.
let messageListElement = document.getElementById('messages'),
    messageFormElement = document.getElementById('message-form'),
    messageInputElement = document.getElementById('message'),
    submitButtonElement = document.getElementById('submit'),
    imageButtonElement = document.getElementById('submitImage'),
    imageFormElement = document.getElementById('image-form'),
    mediaCaptureElement = document.getElementById('mediaCapture'),
    userPicElement = document.getElementById('user-pic'),
    userNameElement = document.getElementById('user-name'),
    signInButtonElement = document.getElementById('sign-in'),
    signOutButtonElement = document.getElementById('sign-out'),
    signInSnackbarElement = document.getElementById('must-signin-snackbar');

// Saves message on form submit.
messageFormElement.addEventListener('submit', onMessageFormSubmit);
signOutButtonElement.addEventListener('click', signOut);
signInButtonElement.addEventListener('click', signIn);

// Toggle for the button.
messageInputElement.addEventListener('keyup', toggleButton);
messageInputElement.addEventListener('change', toggleButton);

// Events for image upload.
imageButtonElement.addEventListener('click', (e) => {
  e.preventDefault();
  mediaCaptureElement.click();
});
mediaCaptureElement.addEventListener('change', onMediaFileSelected);

// initialize Firebase
initFirebaseAuth();

// Remove the warning about timstamps change. 
let firestore = firebase.firestore();

// TODO: Enable Firebase Performance Monitoring.
firebase.performance();

// We load currently existing chat messages and listen to new ones.
loadMessages();
