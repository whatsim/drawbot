const needle = require('needle')
const program = require('commander')
// const SVGPathInterpolator = require('svg-path-interpolator')
const SVGO = require('svgo')
const svgo = new SVGO(svgoConfig)
const fs = require('fs')
const sizeOf = require('image-size');
const svgPoints = require('svg-points')
const svgson = require('svgson')
const {parseSVG, makeAbsolute} = require('svg-path-parser')

const repl = require("repl");
let r

let canvasWidth = 300
let canvasHeight = 218
let aspect = canvasHeight/canvasWidth

// const config = {
//     joinPathData: false,
//     minDistance: 0.05,
//     roundToNearest: 0.000001,
//     sampleFrequency: 0.01
// };
// const interpolator = new SVGPathInterpolator(config);
let runCount = 0

program
  .version('0.1.0')
  .parse(process.argv);

let svgPath = program.args[0]

let downPos = 0.75
let upPos = 0

if(svgPath){
	let size = sizeOf(svgPath)
	let data = fs.readFileSync(svgPath)
	svgo.optimize(data).then(function(result) {
		// let pathData = svgPoints.toPoints(result.data)
    setSpeed(25,()=>{
      setMovingSpeed(75)
    })
		svgson(result.data,'utf-8',(e)=>{
      let counter = 0
      step()
      function step(){
        if(e.childs[counter]){
          let p = makeAbsolute(parseSVG(e.childs[counter].attrs.d))
          let outArr =[]

          let last 
          for(let i = 0; i < p.length; i++){
            let x = p[i].x ? p[i].x : last.x
            let y = p[i].y ? p[i].y : last.y

            outArr.push({
              x:x/size.width, //* aspect,
              y:y/size.height,
              down:p[i].command !== "moveto"
            })        
            last = p[i]
          }
          
           moveBatch(outArr,step)
          
          counter ++
        } else {
          runCount ++
          if(runCount < 10) {
            parkPen(()=>{
              setTimeout(()=>{
                setSpeed(25 + runCount * 25,()=>{
                  counter = 0
                  step()
                })  
              },5000)
            })
            
            
          } else {
            parkPen()
          }
        }
      }
    })
		
		
    startRepl()
	}).catch((e)=>{
    console.log(e)
  })
} else {
  startRepl()
}

function startRepl(){
  r = repl.start("drawbot :: ");
  r.context.movePen = movePen
  r.context.engagePen = engagePen
  r.context.parkPen = parkPen
  r.context.disengagePen = disengagePen
  r.context.checkPen = checkPen
  r.context.moveBatch = moveBatch
  r.context.setSpeed = setSpeed
}

needle.get('localhost:9999/v1/settings/bot',(e,r)=>{
  console.log(r.body)
})

function setSpeed(speed,cb){
  needle.put('localhost:9999/v1/settings/bot',{"speed:precision":1},(e,r)=>{
      needle.put('localhost:9999/v1/settings/bot',{"speed:drawing":speed},(e,r)=>{
        if(cb) cb(r)
      })
  })
}

function setMovingSpeed(speed,cb){
  
  needle.put('localhost:9999/v1/settings/bot',{"speed:moving":speed},(e,r)=>{
    if(cb) cb(r)
  })
  
}


function checkPen(cb){
	needle.get('localhost:9999/v1/pen',(e,r)=>{
		if(!e){
			// console.log(r.body)
			if(cb) cb(r)
		}
	})
}

function parkPen(cb){
	needle.delete('localhost:9999/v1/pen',null,(e,r)=>{
		if(!e){
			// console.log(r.body)
			if(cb) cb(r)
		}
	})
}

function engagePen(cb){
	needle.put('localhost:9999/v1/pen',{"state":downPos},(e,r)=>{
		if(!e){
			// console.log(r.body)
			if(cb) setTimeout(()=>{
        cb(r)
      },100)
		}
	})
}

function disengagePen(cb){
  setTimeout(()=>{
    needle.put('localhost:9999/v1/pen',{"state":upPos},(e,r)=>{
      if(!e){
        // console.log(r.body)
        if(cb) cb(r)
      }
    })
  },100)
	
}

// in percent
function movePen(x,y,cb){
	needle.put('localhost:9999/v1/pen',{x,y},(e,r)=>{
		if(!e){
			// console.log(r.body)
			if(cb) cb(r)
		}
	})
}

function resetCounter(cb){
	needle.put('localhost:9999/v1/pen',{'resetCounter':1},(e,r)=>{
		if(!e){
			// console.log(r.body)
			if(cb) cb(r)
		}
	})
}

function moveBatch(coordArr, cb){
	let counter = -1
	console.log('starting batch')
  resetCounter()
	step()
	function step(){
		
		counter ++
		if(coordArr[counter]){
      let penFunc
			if(coordArr[counter].down === false) penFunc = disengagePen
			else penFunc = engagePen
			
			penFunc(()=>{
        movePen(coordArr[counter].x * 100,coordArr[counter].y* 100,step)
      })
			// console.log(`moving to ${coordArr[counter].x}, ${coordArr[counter].y}`)
		} else {
      // disengagePen()
      if(cb) cb()
    }
	}

}

// moveBatch([{
// 	x:0.5,y:0.5,down:true
// },{
// 	x:0,y:0,down:true
// },{
// 	x:0.5,y:0.5,down:true
// }
// ])


// engagePen()
// disengagePen()
var svgoConfig = [{
          cleanupAttrs: true,
        }, {
          removeDoctype: true,
        },{
          removeXMLProcInst: true,
        },{
          removeComments: true,
        },{
          removeMetadata: true,
        },{
          removeTitle: true,
        },{
          removeDesc: true,
        },{
          removeUselessDefs: true,
        },{
          removeEditorsNSData: true,
        },{
          removeEmptyAttrs: true,
        },{
          removeHiddenElems: true,
        },{
          removeEmptyText: true,
        },{
          removeEmptyContainers: true,
        },{
          removeViewBox: false,
        },{
          cleanUpEnableBackground: true,
        },{
          convertStyleToAttrs: true,
        },{
          convertColors: true,
        },{
          convertPathData: true,
        },{
          convertTransform: true,
        },{
          removeUnknownsAndDefaults: true,
        },{
          removeNonInheritableGroupAttrs: true,
        },{
          removeUselessStrokeAndFill: true,
        },{
          removeUnusedNS: true,
        },{
          cleanupIDs: true,
        },{
          cleanupNumericValues: true,
        },{
          moveElemsAttrsToGroup: true,
        },{
          moveGroupAttrsToElems: true,
        },{
          collapseGroups: true,
        },{
          removeRasterImages: false,
        },{
          mergePaths: false,
        },{
          convertShapeToPath: true,
        },{
          sortAttrs: true,
        },{
          transformsWithOnePath: true,
        },{
          removeDimensions: true,
        },{
          removeAttrs: {attrs: '(stroke|fill)'},
        }]


  
  