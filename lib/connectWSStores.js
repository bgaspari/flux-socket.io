import React from 'react';
import { shouldPureComponentUpdate } from 'react-pure-render';

export const ConnectWSStores = stores => ComposedComponent => 

class ConnectWSStores extends React.Component {
  
  constructor(props) {
    super(props);
    this.stores = stores;
  }
  
  shouldComponentUpdate = shouldPureComponentUpdate;
  
  componentDidMount = () => {
    this.stores.map(store => {
      store.addChangeListener(this._updateState);
    });
    this._updateState();
  }
  
  componentWillUnmount = () => {
    this.stores.map(store => {
      store.removeChangeListener(this._updateState);
    });
  }
  
  // add a store on the fly
  addStore = (store) => {
    this.stores.push(store);
    store.addChangeListener(this._updateState);
    this._updateState();
  }
  
  // Remove a store
  removeStore = (store) => {
    this.stores.map((s, i) => {
      if (s.getStoreName() === store.getStoreName()) {
        this.stores[i].removeChangeListener(this._updateState);
        delete this.stores[i];
      }
    })
  }
  
  _updateState = () => {
    let newState = {};
    this.stores.map(store => {
      newState = {
        ...newState, 
        ...store.getStoreData()
      };
    });
    this.setState(newState);
  }
  
  render() {
      return <ComposedComponent {...this.props} {...this.state} />;
  }
}

export default ConnectWSStores;
