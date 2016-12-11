/*
  Author: GASPARI Baptiste
  This class create a socket.io server and bind flux store over websocket
  
  It contains an store object containing all stores state.
  It bind flux actions define in all store definition object.
*/

'use strict'

import invariant from 'fbjs/lib/invariant';
import { jsonToObject } from './utils/objectUtils';

export const SERVER_ERROR = 'flux server error';

class storeWSServer {
  
  constructor(PORT) {
    this._io = require('socket.io')(PORT);
    this._stores = {};
    this._listeners = {};
    this._start(this._io);
    console.log('***********************************************');
    console.log('************ FLUX SOCKET.IO SERVER ************');
    console.log('***********************************************\n');
    console.log('Store server listening on port : ' + PORT + '\n');
  }
  
  get io() {
    return this._io;
  }
  
  getStore = (storeName) => {
    return this._stores[storeName];
  }
  
  unsubscribe = (storename) => {
    if(this._stores[storename]) {
      delete this._stores[storename];
    }
  }
  
  addPlugins = (...plugins) => {
    console.log('\n*********** ADD PLUGINS ***********');
    plugins.map(plugin => {
      console.log('\n-> ADD PLUGIN : ' + plugin.name);
      plugin.serverPlugin(this);
    }); 
    console.log('\n***********************************\n');
  }
  
  subscribe = (...stores) => {
    stores.map(store => {
      invariant(
        typeof store.name === 'string',
        'The store definition must contain name String : ' + typeof store.name
      );
      
      console.log('-> SUBSCRIBE STORE : ' + store.name);
      
      if (!this._stores[store.name]) {
        this._stores[store.name] = store;
      } else {
        this._io.emit(SERVER_ERROR, 'Existing store : ' + store.name);
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
    
    console.log('-> ADD LISTENER :' + listenerName);
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

      store[action] = (data, oldState, socket) => {
        return newState;
      }
  */
  _setStoreAction = (socket, store) => {
    const io = this._io;
    Object.keys(store).map(key => {
      if (key !== 'name' && key !== 'state') {
        socket.on(key, (actionData, updateState = true) => {
          const resultAction = store[key](actionData, store.state, socket);
          // Update Store state and send it to client
          if (resultAction) {
            // Merging the new state if the action change the state
            if (updateState) {
              store.state = {
                ...store.state,
                ...resultAction
              };
              
              // Send new state to all clients
              io.to(store.name).emit(store.name + 'Update', resultAction);
            // If the state does not change send the result to the client
            } else {
              socket.emit(store.name + 'Update', resultAction);
            }
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
          socket.emit(SERVER_ERROR, 'ClientID must be defined');
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
          socket.emit(SERVER_ERROR, 'Store does not exist : ' + storeName);
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
