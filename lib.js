function doesLineInterceptCircle(A, B, C, radius){
  var dist;
  const v1x = B.x - A.x;
  const v1y = B.y - A.y;
  const v2x = C.x - A.x;
  const v2y = C.y - A.y;
  // get the unit distance along the line of the closest point to
  // circle center
  const u = (v2x * v1x + v2y * v1y) / (v1y * v1y + v1x * v1x);

  // if the point is on the line segment get the distance squared
  // from that point to the circle center
  if(u >= 0 && u <= 1){
    dist  = (A.x + v1x * u - C.x) ** 2 + (A.y + v1y * u - C.y) ** 2;
  } else {
    // if closest point not on the line segment
    // use the unit distance to determine which end is closest
    // and get dist square to circle
    dist = u < 0 ?
      (A.x - C.x) ** 2 + (A.y - C.y) ** 2 :
      (B.x - C.x) ** 2 + (B.y - C.y) ** 2;
  }
  return dist < radius * radius;
}

function closestPointOnLine(line, point){ 
  let lx1 = line.from.x;
  let ly1 = line.from.y;
  let lx2 = line.to.x;
  let ly2 = line.to.y;
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
  return createPoint(cx, cy);
}

function lineSlope(line){
  return (line.to.y - line.from.y) / (line.to.x - line.from.x);
}
