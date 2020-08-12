function doesLineInterceptCircle(A, B, C, radius){
  let dist;
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

// Returns -1 or 1.
// -1 means left,
// 1 means right.
function wallDirection(line){
  return line.from.y - line.to.y > 0 ? 1 : -1
}

function vectorModule(x, y){
  return Math.sqrt((x ** 2) + (y ** 2));
}

function lineModule(line){
  let dx = line.from.x - line.to.x;
  let dy = line.from.y - line.to.y;
  return vectorModule(dx, dy);
}

function normalizeLine(line){
  let mod = lineModule(line);
  return {
    from: {
      x: line.from.x/mod,
      y: line.from.y/mod
    },
    to: {
      x: line.to.x/mod,
      y: line.to.y/mod
    }
  }
}

function lineToVector(line){
  return {
    x: line.to.x - line.from.x,
    y: line.to.y - line.from.y
  };
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
  return new Point(cx, cy);
}

function lineSlope(line){
  return (line.to.y - line.from.y) / (line.to.x - line.from.x);
}

const sameSign = (a, b) => (a * b) > 0;

function intersect(x1, y1, x2, y2, x3, y3, x4, y4){
	let a1, a2, b1, b2, c1, c2;
	let r1, r2 , r3, r4;
	let denom;

	// Compute a1, b1, c1, where line joining points 1 and 2
	// is "a1 x + b1 y + c1 = 0".
	a1 = y2 - y1;
	b1 = x1 - x2;
	c1 = (x2 * y1) - (x1 * y2);

	// Compute r3 and r4.
	r3 = ((a1 * x3) + (b1 * y3) + c1);
	r4 = ((a1 * x4) + (b1 * y4) + c1);

	// Check signs of r3 and r4. If both point 3 and point 4 lie on
	// same side of line 1, the line segments do not intersect.
	if ((r3 !== 0) && (r4 !== 0) && sameSign(r3, r4)){
		return 0; //return that they do not intersect
	}

	// Compute a2, b2, c2
	a2 = y4 - y3;
	b2 = x3 - x4;
	c2 = (x4 * y3) - (x3 * y4);

	// Compute r1 and r2
	r1 = (a2 * x1) + (b2 * y1) + c2;
	r2 = (a2 * x2) + (b2 * y2) + c2;

	// Check signs of r1 and r2. If both point 1 and point 2 lie
	// on same side of second line segment, the line segments do
	// not intersect.
	if ((r1 !== 0) && (r2 !== 0) && (sameSign(r1, r2))){
		return 0; //return that they do not intersect
	}

	//Line segments intersect: compute intersection point.
	denom = (a1 * b2) - (a2 * b1);

	if (denom === 0) {
		return 1; //collinear
	}

	// lines_intersect
	return 1; //lines intersect, return true
}

function linesIntersect(line1, line2){
  if(line1 === null) throw new Error("First line is null");
  if(line2 === null) throw new Error("Second line is null");
  return 1 === intersect(
    line1.from.x,
    line1.from.y,
    line1.to.x,
    line1.to.y,
    line2.from.x,
    line2.from.y,
    line2.to.x,
    line2.to.y,
  );
}

// Converts the line into a linear function and gets y(x).
// Supposed to be used for floors, since walls can be vertical, this might not work (due to infinite slope).
// TODO: Can this be done without getting the first and second point order?
// --------------
// For now, all of these methods are done considering the projection of the line
// as if it was an infinite line, not a segment.
function getYFromX(line, x){
  let firstPoint, secondPoint;
  if(line.from.x < line.to.x){
    firstPoint = line.from;
    secondPoint = line.to;
  } else{
    firstPoint = line.to;
    secondPoint = line.from;
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

function pointInFloor(line, point, yError = 0.00000001){
  let firstPoint, secondPoint;
  if(line.from.x < line.to.x){
    firstPoint = line.from;
    secondPoint = line.to;
  } else{
    firstPoint = line.to;
    secondPoint = line.from;
  }

  if(point.x < firstPoint.x) return false;
  if(point.x > secondPoint.x) return false;

  let y = getYFromX(line, point.x);
  return Math.abs(y - point.y) < yError;
}

function pointBelowOrInLine(line, point){
  let yLine = getYFromX(line, point.x);
  return pointInFloor(line, point) || point.y < yLine;
}

function pointHorizontallyBetweenLine(line, point){
  let firstPoint, secondPoint;
  if(line.from.x < line.to.x){
    firstPoint = line.from;
    secondPoint = line.to;
  } else{
    firstPoint = line.to;
    secondPoint = line.from;
  }

  if(point.x < firstPoint.x) return false;
  if(point.x > secondPoint.x) return false;
  return true;
}

function line1BelowLine2(line1, line2){
  return pointBelowOrInLine(line2, line1.from) &&
  pointBelowOrInLine(line2, line1.to);
}
