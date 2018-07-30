import { Router } from "express";
import * as express from 'express';
import * as fs from 'fs-extra';
import * as path from 'path';

export function makeArrayLikeQueryCondition(queryValue: string | Array<String>): any {
  if (queryValue instanceof Array) {
    return { "$in": queryValue }
  } else { return queryValue }
}

export class RouterWrapper{
  public readonly router: Router
  constructor(){
    this.router = express.Router()
  }
}

var promiseAllWait = function(promises) {
  // this is the same as Promise.all(), except that it will wait for all promises to fulfill before rejecting
  var all_promises = [];
  for(var i_promise=0; i_promise < promises.length; i_promise++) {
      all_promises.push(
          promises[i_promise]
          .then(function(res) {
              return { res: res };
          }).catch(function(err) {
              return { err: err };
          })
      );
  }

  return Promise.all(all_promises)
  .then(function(results) {
      return new Promise(function(resolve, reject) {
          var is_failure = false;
          var i_result;
          for(i_result=0; i_result < results.length; i_result++) {
              if (results[i_result].err) {
                  is_failure = true;
                  break;
              } else {
                  results[i_result] = results[i_result].res;
              }
          }

          if (is_failure) {
              reject( results[i_result].err );
          } else {
              resolve(results);
          }
      });
  });
};

var movePromiser = function(from, to, records) {
  return fs.move(from, to)
  .then(function() {
      records.push( {from: from, to: to} );
  });
};

export function moveDir(from_dir, to_dir) {
  return fs.readdir(from_dir)
  .then(function(children) {
      return fs.ensureDir(to_dir)
      .then(function() {
          var move_promises = [];
          var moved_records = [];
          var child;
          for(var i_child=0; i_child < children.length; i_child++) {
              child = children[i_child];
              move_promises.push(movePromiser(
                  path.join(from_dir, child),
                  path.join(to_dir, child),
                  moved_records
              ));
          }

          return promiseAllWait(move_promises)
          .catch(function(err) {
              var undo_move_promises = [];
              for(var i_moved_record=0; i_moved_record < moved_records.length; i_moved_record++) {
                  undo_move_promises.push( fs.move(moved_records[i_moved_record].to, moved_records[i_moved_record].from) );
              }

              return promiseAllWait(undo_move_promises)
              .then(function() {
                  throw err;
              });
          });
      }).then(function() {
          return fs.rmdir(from_dir);
      });
  });
};