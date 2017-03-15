'use strict'
const winston           = require('winston')
const chalk             = require('chalk')

const DataObject        = require('../../../models/DataObject')

module.exports = ( req, res ) => {
  let excludeString = ''
  if( req.params.type === 'encoded' ) excludeString = '-value'
  if( req.params.type === 'web' ) excludeString = '-encodedValue'
  if( req.params.type === 'properties' ) excludeString = '-encodedValue -value'  

  DataObject.findOne( { hash: req.params.hash }, excludeString )
  .then( obj => { 
    if( !obj ) throw new Error('Invalid object.')
    res.status(200)
    res.send( {
      success: true,
      message: 'Found object ' + req.params.hash,
      data: obj
    } )
  } )
  .catch( err => {
    res.status(404)
    return res.send( { success: false, message: 'Failed to find object.', hash: req.params.hash } )
  })
}