/*
  Author: GASPARI Baptiste
  This class create a store client over socket.io websocket
  
  it bind store update stream from the flux ws server and dispatch changed state to the view
*/

'use strict'

import { EventEmitter } from 'events';
import invariant from 'fbjs/lib/invariant';
const CHANGE_EVENT = 'change event';

class storeWSClient extends EventEmitter {
  constructor(name, dispatcher) {
    super();
    this._data = {};
    this._dispatcher = dispatcher;
    
    if(name) {
      this.init(name);
    }
  }
  
  init = (storeName) => {
    this._storeName = storeName;
    this._dispatcher.dispatch('store connect', this._dispatcher.clientID, this._storeName);
    
    this._dispatcher.registerStore(this._storeName, (data) => {
      this._data = {
        ...this._data,
        ...data
      }
      this.emitChange();
    });
  }
  
  get dispatcher() {
    return this._dispatcher;
  }
  
  get storeName() {
    return this._storeName;
  }
  
  get data() {
    return this._data;
  }
  
  emitChange = () => {
    this.emit(CHANGE_EVENT);
  }
  
  addChangeListener = (callback) => {
    this.on(CHANGE_EVENT, callback);
  }
  
  removeChangeListener = (callback) => {
    this.removeListener(CHANGE_EVENT, callback);
  }
}

export default storeWSClient;
