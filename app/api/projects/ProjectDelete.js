const winston = require( '../../../config/logger' )

const Project = require( '../../../models/Project' )
const DataStream = require( '../../../models/DataStream' )
const PermissionCheck = require( '../middleware/PermissionCheck' )

module.exports = async ( req, res ) => {
  if ( !req.params.projectId ) {
    res.status( 400 )
    return res.send( { success: false, message: 'No projectId provided' } )
  }

  try {
    let project = await PermissionCheck( req.user, 'delete', await Project.findOne( { _id: req.params.projectId } ) )

    if ( !project )
      return res.status( 400 ).send( { success: false, message: `Could not find projectId ${req.params.projectId}` } )

    let streams = await DataStream.find( { streamId: { $in: project.streams } }, 'canWrite canRead streamId owner' )
    let allOtherProjects = await Project.find( { 'streams': { $in: project.streams }, _id: { $ne: project._id } } )

    let modifiedStreams = [ ]

    for ( let stream of streams ) {
      let otherProjects = allOtherProjects.filter( p => p.streams.indexOf( stream.streamId ) > -1 )
      let otherCW = Array.prototype.concat( ...otherProjects.map( p => p.permissions.canWrite ) )
      let otherCR = Array.prototype.concat( ...otherProjects.map( p => p.permissions.canRead ) )

      let modified = false

      project.permissions.canRead.forEach( id => {
        let index = stream.canRead.indexOf( id )
        if ( otherCR.indexOf( id ) === -1 && index > -1 ) {
          stream.canRead.splice( index, 1 )
          modified = true
        }
      } )

      project.permissions.canWrite.forEach( id => {
        let index = stream.canWrite.indexOf( id )
        if ( otherCW.indexOf( id ) === -1 && index > -1 ) {
          stream.canWrite.splice( index, 1 )
          modified = true
        }
      } )
      if ( modified ) modifiedStreams.push( stream )
    }

    await Promise.all( [
      ...modifiedStreams.map( s => s.save( ) )
      // Project.deleteOne( { _id: project._id } )
    ] )

    res.send( { success: true, message: 'Project was permanently deleted.', modifiedStreams: modifiedStreams.map( s => s.streamId ) } )
  } catch ( err ) {
    res.status( 400 ).send( { success: false, message: err } )
  }

  // Project.findOne( { _id: req.params.projectId } )
  //   .then( resource => PermissionCheck( req.user, 'delete', resource ) )
  //   .then( resource => resource.remove() )
  //   .then( () => {
  //     res.send( { success: true, message: 'Project deleted. Bye bye data.' } )
  //   } )
  //   .catch( err => {
  //     winston.error( JSON.stringify( err ) )
  //     res.status( err.message.indexOf( 'authorised' ) >= 0 ? 401 : 404 )
  //     res.send( { success: false, message: err.message } )
  //   } )
}
