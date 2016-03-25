export function jsonToObject(json){
  const jsonObject = JSON.parse(json);
  Object.keys(jsonObject).map(key => {
    if (typeof jsonObject[key] === 'string' 
        && jsonObject[key].indexOf('function') > -1) {
          jsonObject[key] = eval('(' + jsonObject[key] + ')');
        }
  });
  
  return jsonObject;
}

export function toJson(object) {
  return JSON.stringify(object, function(key, value) {
    if (typeof value === "function") {
      return value.toString();
    }
    return value;
  });
}
