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

// googleアカウントでサインインしたいときにポップアップ表示
const signInGoogle = () => {
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

    // ここに条件分岐 動物ならその写真をリターン

  return firebase.auth().currentUser.photoURL || '/image/profile_placeholder.png'
}

// ユーザーネームを返す
const getUserName = () => {

  // ここに条件分岐 動物ならその名前をリターン

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

// firestoreにあるmessagesコレクションを読み込み、関数displayMessageに渡す
//  queryはコレクション
const loadMessages = () => {
  let query = firebase.firestore()
    .collection('messages')
    .orderBy('timestamp', 'desc')
    .limit(20);
  // onSnapshotとは:queryコレクションをリッスンして、snapshotに渡す
  // docChangesとは: 変更のあったドキュメント
  query.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      // docChangesのtypeには三種類あり、add,remove,modified
      if (change.type === 'removed') {
        deleteMessage(change.doc.id);
      } else {
        //ここでのchange.doc.date()には、ドキュメントの全データが入ってる
        let message = change.doc.data();
        displayMessage(change.doc.id, message.timestamp, message.name,
          message.text, message.profilePicUrl, message.imageUrl)
      }
    });
  });
}

// 画像をmessageコレクションに保存　ただしブラックボックス。。。
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
    // 上のdataを表示させるためのもの
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

// サインイン・アウトして具体的にviewに反映させること
const authStateObserver = (user) => {
  if (user) { 
    let profilePicUrl = getProfilePicUrl(),
        userName = getUserName();
    userPicElement.style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(profilePicUrl) + ')';
    userNameElement.textContent = userName;

    userNameElement.removeAttribute('hidden');
    userPicElement.removeAttribute('hidden');
    signOutButtonElement.removeAttribute('hidden');
    signInButtonElement.setAttribute('hidden', 'true');

  } else { 
    userNameElement.setAttribute('hidden', 'true');
    userPicElement.setAttribute('hidden', 'true');
    signOutButtonElement.setAttribute('hidden', 'true');
    signInButtonElement.removeAttribute('hidden');
  }
}

// サインインをしてればtrueを返す、してなければ注意してfalseを返す
const checkSignedInWithMessage = () => {

// 条件分岐を加える　動物としてlogged inしてるかどうか

  if (!!firebase.auth().currentUser) {
    return true;
  }
  let data = {
    message: 'いずれかの動物でログインして下さい',
    timeout: 2000
  };
  // 上のdataを表示させるためのもの
  signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
  return false;
}

const resetMaterialTextfield = (element) => {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
}

// urlに?sz=150をつける
const addSizeToGoogleProfilePic = (url) => {
  if (url.indexOf('googleusercontent.com') !== -1 && url.indexOf('?') === -1) {
    return url + '?sz=150';
  }
  return url;
}

// おそらく、queryのlimit数からはみ出たメッセージを削除するためのもの
const deleteMessage = (id) => {
  let div = document.getElementById(id);
  if (div) {
    div.parentNode.removeChild(div);
  }
}

const MESSAGE_TEMPLATE =
  '<div class="message-container">' +
  '<div class="spacing"><div class="pic"></div></div>' +
  '<div class="message"></div>' +
  '<div class="name"></div>' +
  '</div>';

// メッセージ一覧に指定idが無い時に、#messagesの子ノードにtimestampを考慮に入れながら挿入
const createAndInsertMessage = (id, timestamp) => {
  const container = document.createElement('div');
  // innerHTMLとは: container Elementに対して、指定のhtmlを入れる
  container.innerHTML = MESSAGE_TEMPLATE;
  // firstChildは第一子ノードを取り出すが、改行も1つの子ノードなので注意
  const div = container.firstChild;
  // ここでidとして渡されているのは、ドキュメントのなっがいid
  div.setAttribute('id', id);
  timestamp = timestamp ? timestamp.toMillis() : Date.now();
  div.setAttribute('timestamp', timestamp);

  const existingMessages = messageListElement.children;
  if (existingMessages.length === 0) {
    // もし#messagesの子ノードに何もなかったらdivを追加する
    messageListElement.appendChild(div);
  } else {
    let messageListNode = existingMessages[0];

    while (messageListNode) {
      // 比較するためにtimestamp属性を引き出す
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


const displayMessage = (id, timestamp, name, text, picUrl, imageUrl) => {
  let div = document.getElementById(id) || createAndInsertMessage(id, timestamp);
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(picUrl) + ')';
  }
  div.querySelector('.name').textContent = name;
  let messageElement = div.querySelector('.message');
  if (text) { 

    // ここにあとで条件分岐を入れる！動物によってtextを入れるのか、を変える

    messageElement.textContent = text;
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
    // 以下画像表示　ブラックボックス。。。
  } else if (imageUrl) {
    let image = document.createElement('img');
    image.addEventListener('load', function () {
      messageListElement.scrollTop = messageListElement.scrollHeight;
    });
    image.src = imageUrl + '&' + new Date().getTime();
    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
  setTimeout(() => { div.classList.add('visible') }, 1);
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
signInButtonElement.addEventListener('click', signInGoogle);

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
