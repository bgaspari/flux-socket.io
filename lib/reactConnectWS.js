import React from 'react';
import { shouldPureComponentUpdate } from 'react-pure-render';

class ReactConnect extends React.Component {
  
  shouldComponentUpdate = shouldPureComponentUpdate;
  
  componentDidMount = () => {
    this.props.stores.map(store => {
      store.addChangeListener(this._updateState);
    });
    this._updateState();
  }
  
  componentWillUnmount = () => {
    this.props.stores.map(store => {
      store.removeChangeListener(this._updateState);
    });
  }
  
  _updateState = () => {
    let newState = {};
    this.props.stores.map(store => {
      newState = {
        ...newState, 
        ...store.getStoreData()
      };
    });
    this.props.updateState(newState);
  }
  
  render() {
    return this.props.children;
  }
}

export default ReactConnect;
