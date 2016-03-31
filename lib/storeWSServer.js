/*
  Author: GASPARI Baptiste
  This class create a socket.io server and bind flux store over websocket
  
  It contains an store object containing all stores state.
  It bind flux actions define in all store definition object.
*/

'use strict'

import invariant from 'fbjs/lib/invariant';
import { jsonToObject } from './utils/objectUtils';

const ERROR = 'flux server error';

class storeWSServer {
  
  constructor(PORT) {
    this._io = require('socket.io')(PORT);
    this._stores = {};
    this._listeners = {};
    this._start(this._io);
    console.log('Store server listening on port : ' + PORT);
  }
  
  getStore = (storeName) => {
    return this.stores[storeName];
  }
  
  addPlugins = (...plugins) => {
    plugins.map(plugin => {
      plugin.serverPlugin(this);
    }); 
  }
  
  subscribe = (...stores) => {
    stores.map(store => {
      invariant(
        typeof store.name === 'string',
        'The store definition must contain name String : ' + typeof store.name
      );
      
      if (!this._stores[store.name]) {
        this._stores[store.name] = store;
      } else {
        this._io.emit(ERROR, 'Existing store : ' + store.name);
      }
    });
    
    return this;
  }
  
  /*
    Let user to define specific socket.io listener
    This listener callback can access to io and socket object.
    
    example: function(io, socket, ...data){socket.emit('hello', 'Hello world')}
  */
  createListener = (listenerName, callback) => {
    invariant(
      typeof callback === 'function',
      'The callback listener have to be a function : ' + typeof callback
    );
    
    if (typeof callback === 'function') {
      this._listeners[listenerName] = callback; 
    }
  }
  
  /*
    Set Store Action Listener 
    The store definition contains : 
      - a name
      - an initialState
      - all actions function
      
    example of a store definition : 
      const store = {
        name: 'store',
        state: initialState
      }

      store[action] = (data, oldState, socket, storeServer) => {
        return newState;
      }
  */
  _setStoreAction = (socket, store) => {
    const io = this._io;
    Object.keys(store).map(key => {
      if (key !== 'name' && key !== 'state') {
        socket.on(key, (actionData, broadcast = true) => {
          // Merging new state calculated with the handled action
          const newState = {
            ...store.state,
            ...store[key](actionData, store.state, socket, this)
          };
          store.state = {...newState};
          // By default broadcast state to all clients connected to the store
          if (broadcast) {
            io.to(store.name).emit(store.name + 'Update', newState);
          // But sometimes we want update just one client state 
          } else {
            socket.emit(store.name + 'Update', newState);
          }
        });
      }
    });
  }
  
  _start = (io) => {
    io.on('connection', (socket) => {
      /*
        Connect to the factory :
          - adding clientID to the socket object
      */
      socket.on('factory connect', (clientID) => {
        if (clientID && typeof clientID !== 'undefined') {
          socket.clientID = clientID;
        } else {
          socket.emit(ERROR, 'ClientID must be defined');
        }
        
      });
      
      /*
        Disconnect to the factory
      */
      socket.on('disconnect', () => {
        io.emit('client disconnected', socket.clientID);
      })
      
      /*
        Connect to the storename store :
          - create store action listener for this client
          - join the client to store room
          - emitting store state to the client
      */
      socket.on('store connect', (clientID, storeName) => {
        const store = this._stores[storeName];
        if (store) {
          this._setStoreAction(socket, store);
          socket.join(storeName);
          socket.emit(storeName + 'Update', this._stores[storeName].state);  
        } else {
          socket.emit(ERROR, 'Store does not exist : ' + storeName);
        }
      });
      
      // Bind specific listener
      Object.keys(this._listeners).map(listenerName => {
        socket.on(listenerName, (...data) => {
          this._listeners[listenerName](io, socket, ...data);
        })
      });
      
    });
  }
}

export default storeWSServer;
