# Rislack
## 概要
URL: https://gs-chat-282bd.firebaseapp.com/

発想力が致命的な人間なので、ネットに落ちてたチュートリアルに毛を生やしただけです。  
そのチュートリアル: [Firebase web codelab](https://codelabs.developers.google.com/codelabs/firebase-web/#0)

もちろん試しに送信していただいて大丈夫です。  
ちなみにリスザルでログインし送信すると鳴き声にしかならないバグがあります。

## コード等

- Zip: https://drive.google.com/file/d/1Y4EFoNOLe6VOQH09G1nTz-c57fpqSAcr/view?usp=sharing

- Database構造のスクリーンショット: https://drive.google.com/file/d/1IZmqPo-hIJlDwQYZ-tFJGk95BxApKNX1/view?usp=sharing

- Database Rule:

```JavaScript
service cloud.firestore {
  match /databases/{database}/documents {
    // Messages:
    //   - Anyone can read.
    //   - Authenticated users can add and edit messages.
    //   - Validation: Check name is same as auth token and text length below 300 char or that imageUrl is a URL.
    //   - Deletes are not allowed.
    match /messages/{messageId} {
      allow read;
      allow create, update: if request.auth != null
                    && request.resource.data.name == request.auth.token.name
                    && (request.resource.data.text is string
                      && request.resource.data.text.size() <= 300
                      || request.resource.data.imageUrl is string
                      && request.resource.data.imageUrl.matches('https?://.*'));
      allow delete: if false;
    }
    // FCM Tokens:
    //   - Anyone can write their token.
    //   - Reading list of tokens is not allowed.
    match /fcmTokens/{token} {
      allow read: if false;
      allow write;
    }
  }
}
```

- Storage Rule:

```JavaScript
// Returns true if the uploaded file is an image and its size is below the given number of MB.
function isImageBelowMaxSize(maxSizeMB) {
  return request.resource.size < maxSizeMB * 1024 * 1024
      && request.resource.contentType.matches('image/.*');
}

service firebase.storage {
  match /b/{bucket}/o {
    match /{userId}/{messageId}/{fileName} {
      allow write: if request.auth != null && request.auth.uid == userId && isImageBelowMaxSize(5);
      allow read;
    }
  }
}
```



## 反省点
1. mdlの理解まで手が回らず、既存のhtml,cssをあまり弄れなかった。
1. npm,node.js周りの理解が甘く、ディレクトリ・ファイル構造が適切なのかがわからない。そのせいで、momentモジュールを入れた実装がうまく出来なかった。
1. 既存のJavaScriptコードの多くをほぼパクる形となり、ブラックボックスも多くなってしまった。
1. authUIやMLkitにも手を出したかった。


***  

※Markdown記法を勉強中(笑)
