# bookwalker-shelf

BOOK☆WALKER の購入済み書籍一覧（`https://bookwalker.jp/holdBooks/`）を、シリーズごとのカード表示に切り替える Chrome 拡張。

> **非公式の個人用拡張です。** BOOK☆WALKER とは無関係で、本棚ページが内部で使っている非公開の API を利用しています。サイトの変更で動かなくなることがあります。サーバーに負担をかけないよう、通信はボタンを押したときだけ行います。

- シリーズ単位のカード（表紙・所持冊数・未読/読みかけの件数・未購入の既刊あり）
- カードを開くと巻を既刊順に並べ、未読・読みかけ（進捗 %）・既読を表示
- シリーズ名・書名での絞り込み、「未読・読みかけのあるシリーズのみ」
- 「元の表示に戻す」で本来の一覧に切り替え（既読の変更などは元の表示で行う）

## 仕組み

本棚ページ自身が使っている `/prx/holdBooks-api/hold-book-list/` から一覧を取得する。

- 「本棚を取得する」「全件取り直す」: 配信日順で全ページ（50 件/ページ）とシリーズ情報を 1 秒間隔で取得し、`chrome.storage.local` に保存（1000 冊で約 27 リクエスト）
- 「最新に更新」: 読んだ順・購入日順の書籍と、購入日順のシリーズの 1 ページ目だけを取り直して反映（3 リクエスト）
- ページを開いただけでは通信しない（保存済みの内容を表示する）。自動更新はしない
- 巻の並び: 全巻のタイトルから重複なく巻数が取れれば巻数順、取れなければ配信日順

## インストール

Chrome ウェブストアには公開していないため、ソースからビルドして読み込む。

### 必要なもの

- Node.js 20 以上
- pnpm（`corepack enable` で有効にできる）
- Google Chrome（または Chromium 系ブラウザ）

### ビルド

```sh
git clone <このリポジトリの URL>
cd bookwalker-shelf
pnpm install
pnpm build
```

`dist/content.js` が生成される。`dist/` はリポジトリに含めていないので、ビルドしないと拡張は動かない。

### Chrome に読み込む

1. Chrome で `chrome://extensions` を開く
2. 右上の「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」を押し、`manifest.json` のあるこのディレクトリを選ぶ
4. BOOK☆WALKER にログインした状態で [購入済み書籍一覧](https://bookwalker.jp/holdBooks/) を開く
5. 「本棚を取得する」を押す（1000 冊で 30 秒前後）

### 更新

```sh
git pull
pnpm install
pnpm build
```

その後、`chrome://extensions` でこの拡張の再読み込みボタン（↻）を押し、本棚ページを開き直す。

### アンインストール

`chrome://extensions` で「削除」を押す。取得した本棚の内容（`chrome.storage.local`）も一緒に消える。

## 開発

```sh
pnpm test       # vitest
pnpm typecheck
pnpm watch      # esbuild の監視ビルド
```
