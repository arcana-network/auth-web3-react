# Arcana auth Web3 react connector

Arcana auth connector for [web3-react](https://github.com/Uniswap/web3-react)

## Install

```sh
yarn add @arcana/auth-web3-react @arcana/auth
```

## Usage

```ts
import { ArcanaConnector } from "@arcana/auth-web3-react"
import { AuthProvider } from "@arcana/auth"
import { initializeConnector } from "@web3-react/core"


const auth = new AuthProvider(`${arcana_client_id}`) // Singleton


export const [authConnect, hooks] = initializeConnector(
  (actions) =>
    new ArcanaConnector({
      actions,
      auth,
    })
)
```
