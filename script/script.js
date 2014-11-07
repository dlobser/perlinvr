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
		vrEffect.render( scene, camera );

		requestAnimationFrame( animate );
	}

	function initScene() {
		renderer = new THREE.WebGLRenderer();

		scene = new THREE.Scene();
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
		var boxGeo = new THREE.BoxGeometry(1, 1, 1);
		for (var i = 0; i < 40; i++) {
			var box = new THREE.Mesh( boxGeo,
				new THREE.MeshLambertMaterial({
					color: (new THREE.Color()).setHSL(Math.random(), 0.7, 0.25)
				})
			);
			var angle = Math.PI * i / 20;
			box.position.set(
				Math.cos(angle) * 4,
				Math.sin(angle * 8) + 2,
				Math.sin(angle) * 4
			);
			box.receiveShadow = true;
			scene.add(box);
			pickTargets.push(box);
		}

		vrMouse = new THREE.VRMouse( camera, pickTargets, {
			element: renderer.domElement,
			near: 1,
			onMouseOver: function (obj) {
				console.log('hover', obj);
			},
			onMouseOut: function (obj) {
				console.log('stop hover', obj);
			},
			onClick: function (intersection) {
				var box = new THREE.Mesh( boxGeo,
					new THREE.MeshLambertMaterial({
						color: (new THREE.Color()).setHSL(Math.random(), 0.7, 0.25)
					})
				);
				box.scale.set(0.2, 0.2, 0.2);
				box.position.copy(intersection.point);
				scene.add(box);
				pickTargets.push(box);
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
		pickTargets.push(floor);

		var sphere = new THREE.Mesh(
			new THREE.SphereGeometry( 5, 32, 32 ),
			new THREE.MeshNormalMaterial()
		);
		sphere.position.set( 0, 10, 4 );
		sphere.name = 'sphere';
		scene.add( sphere );
		pickTargets.push( sphere );

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

	init();
	animate();
}());