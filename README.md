## Askcoin-explorer

You can use askcoin-explorer to view the information of the blocks produced by miners, as well as the transaction and account information contained in each block. Anyone can run askcoin-explorer, just download it to the local computer and open the ***index.html*** file with browser. You can also deploy explorer with nginx if you want it to be accessed by more people. Askcoin-explorer uses websocket technology to synchronize block information from the full node in real time. If you run a full node yourself, then you can make explorer synchronize data from your own full node by modifying the following line in the ***askcoin.js*** file:

```javascript
var WS = new WebSocket ("ws://explorer.askcoin.me:19050");
```





## Full node & Mobile app

- Full node: https://github.com/lichuan/askcoin
- Mobile app: https://github.com/lichuan/askcoin-client

