
/*
  linked set
*/
class LinkedSet {
  constructor() {
    this.clear();
  }

  clear() {
    this.array = [];
    this.set = {};
  }

  push(obj) {
    if( this.set[obj] ) {
      return;
    }
    this.array.push(obj);
    this.set[obj] = true;
  }

  shift() {
    if( this.array.length > 0 ) {
      let obj = this.array.shift();
      delete this.set[obj];
      return obj;
    }
    return undefined;
  }

  remove(obj) {
    delete this.set[obj];
    for( let i = 0; i < this.array.length; i ++ ) {
      let item = this.set[i];
      if( item == obj ) {
        this.array.splice(i, 1);
        return;
      }
    }
  }

  isEmpty() {
    return this.array.length == 0;
  }

  length() {
    return this.array.length;
  }
}