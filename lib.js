// Returns -1 or 1.
// -1 means left,
// 1 means right.
function wallDirection(line){
  return line.p.y - line.q.y > 0 ? 1 : -1
}

// TODO: Deprecated. Remove sometime soon.
function closestPointOnLine(line, point){ 
  let lx1 = line.p.x;
  let ly1 = line.p.y;
  let lx2 = line.q.x;
  let ly2 = line.q.y;
  let x0 = point.x;
  let y0 = point.y;
  let A1 = ly2 - ly1; 
  let B1 = lx1 - lx2; 
  let C1 = (ly2 - ly1)*lx1 + (lx1 - lx2)*ly1; 
  let C2 = -B1*x0 + A1*y0; 
  let det = A1*A1 - -B1*B1; 
  let cx = 0; 
  let cy = 0; 
  if(det != 0){ 
    cx = ((A1*C1 - B1*C2)/det); 
    cy = ((A1*C2 - -B1*C1)/det); 
  } else{ 
    cx = x0; 
    cy = y0; 
  } 
  return new Point(cx, cy);
}

// Converts the line into a linear function and gets y(x).
// Supposed to be used for floors, since walls can be vertical, this might not work (due to infinite slope).
// TODO: Can this be done without getting the first and second point order?
// --------------
// For now, all of these methods are done considering the projection of the line
// as if it was an infinite line, not a segment.
function getYFromX(line, x){
  let firstPoint, secondPoint;
  if(line.p.x < line.q.x){
    firstPoint = line.p;
    secondPoint = line.q;
  } else{
    firstPoint = line.q;
    secondPoint = line.p;
  }

  // With these, errors (or even if 'return false' is written instead), it would not consider
  // walls that are just a bit separated from a floor so that the points become outside
  // (horizontally) from a line, but close enough that the character collides with them
  // when also on a floor.
  //if(x < firstPoint.x) throw new Error("x value is too low (out of bounds)");
  //if(x > secondPoint.x) throw new Error("x value is too high (out of bounds)");

  let xPercentage = (x - firstPoint.x) / (secondPoint.x - firstPoint.x);
  return firstPoint.y + ((secondPoint.y - firstPoint.y) * xPercentage);
}

function segmentToAscX(s) {
  if (s.p.x < s.q.x) return s
  return new Segment(s.q, s.p)
}

function pointBelowFloor(r, { p, q }) {
  console.assert(p.x < q.x)
  return q.sub(p).cross(r.sub(p)) < 1e-9
}

// TODO: There are some bugs, it seems.
//       It doesn't cross the floors correctly.
//       Try using the previous method.
function wallBelowFloor({ p, q }, floor) {
  floor = segmentToAscX(floor)
  return pointBelowFloor(p, floor) && pointBelowFloor(q, floor)
}
