(function () {
	var initialCameraPosition = {
			x: 0,
			y: 1.82,
			z: 0
		},

		FOG = 250,
		MOVE_SPEED = 1,
		SLOW_SPEED = MOVE_SPEED / 2,

		camera,
		head,
		scene,
		renderer,
		vrEffect,
		vrControls,
		vrMouse,

		keys = {
			forward: false,
			left: false,
			backward: false,
			right: false,
			w: false,
			a: false,
			s: false,
			d: false
		},
		moving = false,

		moveVector = new THREE.Vector3(),
		leftVector = new THREE.Vector3(),
		scratchVector = new THREE.Vector3(),
		leftRotateMatrix = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3( 0, 1, 0 ), Math.PI / 2),

		lookTarget = new THREE.Vector3(),
		lookLatitude = 0,
		lookLongitude = -Math.PI / 2,

		pickTargets = [],

		vrButton = document.getElementById('vr'),
		infobutton = document.getElementById('infobutton'),
		info = document.getElementById('info');

	var socketInfo = {quat:{},pos:{},curves:{}};

	var clock = new THREE.Clock();

	THREE.Clock.prototype.reset = function () {
		this.startTime = 0;
		this.oldTime = 0;
		this.elapsedTime = 0;
	};

	function startMoving() {
		if (!moving) {
			// start moving in whichever direction the camera is looking
			moveVector.set(0, 0, 1).applyQuaternion(camera.quaternion);

			//only move along the ground
			moveVector.setY(0).normalize();

			leftVector.copy(moveVector).applyMatrix4(leftRotateMatrix);
			moving = true;
		}
	}

	function stopMoving() {
		updatePosition();
		if (!keys.w && !keys.a && !keys.s && !keys.d) {
			moving = false;
		}
	}

	function updatePosition() {
		var delta = clock.getDelta(),
			cos;

		if (keys.a) { //look left
			lookLongitude -= Math.PI * delta / 10;
		} else if (keys.d) { //look right
			lookLongitude += Math.PI * delta / 10;
		}

		if (keys.w) { //look up
			lookLatitude = Math.min(0.8 * Math.PI / 2, lookLatitude + Math.PI * delta / 10);
		} else if (keys.s) { //look down
			lookLatitude = Math.max(-0.8 * Math.PI / 2, lookLatitude - Math.PI * delta / 10);
		}

		lookTarget.y = Math.sin(lookLatitude);
		cos = Math.cos(lookLatitude);
		lookTarget.x = cos * Math.cos(lookLongitude);
		lookTarget.z = cos * Math.sin(lookLongitude);
		camera.lookAt(lookTarget);

		if (moving) {
			if (keys.forward) {
				scratchVector.copy(moveVector).multiplyScalar(delta * MOVE_SPEED);
				head.position.add(scratchVector);
			} else if (keys.backward) {
				scratchVector.copy(moveVector).multiplyScalar(-delta * SLOW_SPEED);
				head.position.add(scratchVector);
			}

			if (keys.left) {
				scratchVector.copy(leftVector).multiplyScalar(delta * SLOW_SPEED);
				head.position.add(scratchVector);
			} else if (keys.right) {
				scratchVector.copy(leftVector).multiplyScalar(-delta * SLOW_SPEED);
				head.position.add(scratchVector);
			}

			vrMouse.update(); //only need this if the world is animating
		}
	}

	function animate() {


		updatePosition();
		vrControls.update();
		
		otherHead.quaternion.copy(camera.quaternion);
		var vec = camera.position.clone();
		vec.multiplyScalar(2);
		otherHead.position = vec;
		otherHead.position.x = -vec.x;
		otherHead.position.y = vec.y;
		otherHead.position.z = vec.z;

		drawLine(curves);

		socketInfo.quat = camera.quaternion;
		socketInfo.pos = camera.position;
		socketInfo.curves = curves;

		// console.log(socketInfo);
		
		// console.log(curves);
		// console.log(otherHead.position);
		// otherHead.quaternion.x+=.4;
		vrEffect.render( scene, camera );

		requestAnimationFrame( animate );
	}

	function initScene() {

		eyeBall = new THREE.Mesh(new THREE.SphereGeometry( .03,10,10),new THREE.MeshLambertMaterial( {color:0x111111} ));
		eyeBall.position.z=-.6;
		eyeBall.position.x=-.2;
		eyeBall2 = eyeBall.clone();
		eyeBall2.position.x=.2;

		mouth = new THREE.Mesh(new THREE.BoxGeometry(.5,.03,.02),new THREE.MeshLambertMaterial( {color:0x111111} ));
		mouth.position.z=-.5;
		mouth.position.y=-.2;
		otherHead = new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial(  ));
		otherHead.add(eyeBall);
		otherHead.add(eyeBall2);
		otherHead.add(mouth);
		otherHeadParent = new THREE.Object3D();
		otherHeadParent.add(otherHead);
		otherHeadParent.position.z = 3;
		otherHeadParent.position.y = 2;


		lines = new THREE.Object3D();

		renderer = new THREE.WebGLRenderer();

		scene = new THREE.Scene();
		scene.add(otherHeadParent);
		scene.add(lines);
		linePickSetup();
		scene.fog = new THREE.Fog( 0xffffff, FOG * 0.9, FOG );

		head = new THREE.Object3D();
		head.rotateY(Math.PI);
		head.position.x = initialCameraPosition.x;
		head.position.y = initialCameraPosition.y;
		head.position.z = initialCameraPosition.z;
		scene.add(head);

		camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, FOG * 2 + 1);
		head.add(camera);

		// BOXEN
		var boxGeo = new THREE.BoxGeometry(2, 15, 2);
		for (var i = 0; i < 40; i++) {
			var box = new THREE.Mesh( boxGeo,
				new THREE.MeshLambertMaterial({
					color: (new THREE.Color()).setHSL(Math.random()*.1, 0.7, 0.25)
				})
			);
			var angle = Math.PI * i / 20;
			box.position.set(
				Math.cos(angle) * 10,
				Math.sin(angle * 8) - 2,
				Math.sin(angle) * 10
			);
			box.receiveShadow = true;
			scene.add(box);
			// pickTargets.push(box);
		}

		curves = [];

		

		var draw = false;
		var newLine = true;

		vrMouse = new THREE.VRMouse( camera, pickTargets, {
			element: renderer.domElement,
			near: 1,
			draw: false,
			newLine: true,
			// check: 12,
			onMouseOver: function (obj) {
				console.log('hover', obj);
			},
			onMouseOut: function (obj) {
				console.log('stop hover', obj);
			},
			onClick: function (intersection) {
				// console.log(this.check);
				// var box = new THREE.Mesh( boxGeo,
				// 	new THREE.MeshLambertMaterial({
				// 		color: (new THREE.Color()).setHSL(Math.random(), 0.7, 0.25)
				// 	})
				// );
				// box.scale.set(0.2, 0.2, 0.2);
				// box.position.copy(intersection.point);
				// scene.add(box);
				// pickTargets.push(box);
				// this.draw=!this.draw;
				// console.log(this.draw);
			},
			onMouseDown: function(){
				draw = true;
				if(newLine){
					newCurve = [];
					curves.push(newCurve);
				}
				newLine = false;
			},
			onMouseUp: function(){
				draw = false;
				newLine = true;
				curves.redraw=false;
				
			},
			onMouseMove: function(intersection){
				if(draw){
					curves.redraw=true;
					// console.log(intersection.point);
					newCurve.push(intersection.point);
				}
			}
		} );


		scene.add(vrMouse.pointer);
		renderer.domElement.addEventListener('click', function () {
			vrMouse.lock();
		});

		vrControls = new THREE.VRControls( camera );
		vrControls.freeze = true;

		var floorTexture = THREE.ImageUtils.loadTexture( 'images/concrete.jpg' );
		floorTexture.anisotropy = renderer.getMaxAnisotropy();
		floorTexture.wrapS = THREE.RepeatWrapping;
		floorTexture.wrapT = THREE.RepeatWrapping;
		floorTexture.repeat.set(FOG / 10, FOG / 10);

		var floor = new THREE.Mesh(
			new THREE.CircleGeometry(FOG / 8, 32),
			new THREE.MeshPhongMaterial({
				color: 0x999999,
				specular: 0x111111,

				shininess: 100,
				shading: THREE.SmoothShading
			})
		);
		floor.name = 'floor';
		floor.receiveShadow = true;
		floor.rotateX(-Math.PI / 2);
		scene.add(floor);
		// pickTargets.push(floor);

		var sphere = new THREE.Mesh(
			new THREE.SphereGeometry( 1, 32, 32 ),
			new THREE.MeshLambertMaterial( {color:0x5588ee} )
		);
		sphere.position.set( 0, 10, 4 );
		sphere.name = 'sphere';
		scene.add( sphere );
		// pickTargets.push( sphere );

		var directionalLight = new THREE.DirectionalLight( 0xffffff, 1.475 );
		directionalLight.position.set( 100, 100, -100 );
		scene.add( directionalLight );

		var hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 1.25 );
		hemiLight.color.setHSL( 0.6, 0.0, 0.5 );
		hemiLight.groundColor.setHSL( 0.1, 0.0, 0.3 );
		hemiLight.position.y = 500;
		scene.add( hemiLight );

		// SKYDOME

		var vertexShader = document.getElementById( 'vertexShader' ).textContent;
		var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;
		var uniforms = {
			topColor: 	 { type: "c", value: new THREE.Color( 0x0077ff ) },
			bottomColor: { type: "c", value: new THREE.Color( 0xffffff ) },
			offset:		 { type: "f", value: FOG / 10 },
			exponent:	 { type: "f", value: 0.6 }
		};
		uniforms.topColor.value.copy( hemiLight.color );

		scene.fog.color.copy( uniforms.bottomColor.value );

		var skyGeo = new THREE.SphereGeometry( FOG * 2, 32, 15 );
		var skyMat = new THREE.ShaderMaterial( { vertexShader: vertexShader, fragmentShader: fragmentShader, uniforms: uniforms, side: THREE.BackSide } );

		var sky = new THREE.Mesh( skyGeo, skyMat );
		scene.add( sky );

		renderer.setClearColor( scene.fog.color, 1 );
		renderer.shadowMapType = THREE.PCFSoftShadowMap;
		renderer.shadowMapEnabled = true;

		document.body.appendChild( renderer.domElement );

		vrEffect = new THREE.VRStereoEffect(renderer);
		vrEffect.addEventListener('fullscreenchange', function () {
			vrControls.freeze = !(vrEffect.isFullscreen() || vrEffect.vrPreview());
			if (vrControls.freeze) {
				vrControls.reset();
			} else {
				vrMouse.lock();
			}
		});
	}

	function resize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		//todo: renderer.setSize(width, height);
	}

	function init() {
		initScene();

		resize();
		window.addEventListener('resize', resize, false);

		vrButton.addEventListener('click', function () {
			vrEffect.requestFullScreen();
		}, false);

		//todo: set up button to trigger full screen
		window.addEventListener('keydown', function (evt) {
			console.log('keydown', evt.keyCode);
			if (evt.keyCode === 38) { //up
				keys.forward = true;
				startMoving();
			} else if (evt.keyCode === 40) { //down
				keys.backward = true;
				startMoving();
			} else if (evt.keyCode === 37) { //left
				keys.left = true;
				startMoving();
			} else if (evt.keyCode === 39) { //right
				keys.right = true;
				startMoving();
			} else if (evt.keyCode === 'W'.charCodeAt(0)) {
				keys.w = true;
			} else if (evt.keyCode === 'A'.charCodeAt(0)) {
				keys.a = true;
			} else if (evt.keyCode === 'S'.charCodeAt(0)) {
				keys.s = true;
			} else if (evt.keyCode === 'D'.charCodeAt(0)) {
				keys.d = true;
			} else if (evt.keyCode === 'Z'.charCodeAt(0)) {
				vrControls.zeroSensor();
			} else if (evt.keyCode === 'P'.charCodeAt(0)) {
				if (!vrEffect.isFullscreen()) {
					vrEffect.vrPreview(!vrEffect.vrPreview());
					vrControls.freeze = !vrEffect.vrPreview();
					if (vrControls.freeze) {
						vrControls.reset();
					}
				}
			} else if (evt.keyCode === 187 || evt.keyCode === 61) { //+
				//resizeFOV(0.1);
			} else if (evt.keyCode === 189 || evt.keyCode === 173) { //-
				//resizeFOV(-0.1);
			} else if (evt.keyCode === 13) {
				vrEffect.requestFullScreen();
			}
		}, false);

		window.addEventListener('keyup', function (evt) {
			if (evt.keyCode === 38) { //up
				keys.forward = false;
				stopMoving();
			} else if (evt.keyCode === 40) { //down
				keys.backward = false;
				stopMoving();
			} else if (evt.keyCode === 37) { //left
				keys.left = false;
				stopMoving();
			} else if (evt.keyCode === 39) { //right
				keys.right = false;
				stopMoving();
			} else if (evt.keyCode === 'W'.charCodeAt(0)) {
				keys.w = false;
			} else if (evt.keyCode === 'A'.charCodeAt(0)) {
				keys.a = false;
			} else if (evt.keyCode === 'S'.charCodeAt(0)) {
				keys.s = false;
			} else if (evt.keyCode === 'D'.charCodeAt(0)) {
				keys.d = false;
			} else if (evt.keyCode === 32) { //space
				vrMouse.center();
			}
		}, false);

		window.addEventListener('touchend', function () {
			vrEffect.requestFullScreen();
		});

		document.addEventListener('wheel', function (e) {
			vrMouse.fixedDistance -= e.deltaY / 100;
		}, false);

		infobutton.addEventListener('click', function () {
			if (info.className) {
				info.className = '';
			} else {
				info.className = 'open';
			}
		});

		setTimeout(function () {
			if (vrEffect.hmd()) {
				vrButton.disabled = false;
			}
		}, 1);
	}

	function linePickSetup(){
	    plane2 = new THREE.Mesh(new THREE.PlaneGeometry( 10,10,10,10),new THREE.MeshLambertMaterial( { color:0xFFFFFF, transparent:true, opacity:.1,emissive:0x99DDFF} ));
	    plane2.rotation.x = Math.PI;
	    plane2.position.z = 2;
	    plane2.position.y = 1;
	    scene.add(plane2);
	    // var sp = new THREE.Mesh(new THREE.PlaneGeometry( 1,1,1,1),new THREE.MeshLambertMaterial(  ));
	    // sp.rotation.x = Math.PI;
	    // 	sp.position.z=2;
	    // scene.add(sp)
	    pickTargets.push(plane2);

	}

	function drawLine(arr){

		if(arr.redraw==true){
			if(lines){
				scene.remove(lines);
				lines.traverse(function(obj){
			        if(obj instanceof THREE.Mesh){
			            obj.geometry.dispose();
			            obj.material.dispose();
			        }
			        obj=null;
			    });
			}

			lines = new THREE.Object3D();
			scene.add(lines);

			if(arr.length>0){
				for(var i = 0 ; i < arr.length ; i++){
					if(arr[i].length>1){
						var tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.SplineCurve3( arr[i]), arr[i].length , .02),new THREE.MeshLambertMaterial( {color:0x111111}));
				        lines.add(tube);
				    }
				}
			}
    	}
	}

	init();
	animate();
}());