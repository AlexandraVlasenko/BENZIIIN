class Slider {
    constructor() {
      this.bindAll()
      
      this.vert = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
      `
  
      this.frag = `
      varying vec2 vUv;
  
      uniform sampler2D texture1;
      uniform sampler2D texture2;
      uniform sampler2D disp;
  
      uniform float dispPower;
      uniform float intensity;
      
      void main() {
        vec2 uv = vUv;
        
        vec4 disp = texture2D(disp, uv);
        vec2 dispVec = vec2(disp.x, disp.y);
        
        vec2 distPos1 = uv + (dispVec * intensity * dispPower);
        vec2 distPos2 = uv + (dispVec * -(intensity * (1.0 - dispPower)));
        
        vec4 _texture1 = texture2D(texture1, distPos1);
        vec4 _texture2 = texture2D(texture2, distPos2);
        
        gl_FragColor = mix(_texture1, _texture2, dispPower);
      }
      `
      
      this.el = document.querySelector('.js-slider')
      this.inner = this.el.querySelector('.js-slider__inner')
      this.slides = [...this.el.querySelectorAll('.js-slide')]
      this.bullets = [...this.el.querySelectorAll('.js-slider-bullet')]
      
      this.renderer = null
      this.scene = null
      this.clock = null
      this.camera = null
      
      this.images = [
        // './bg1.jpg',
        // './bg2.jpg',
        // './bg3.jpg'
      ]
      
      this.data = {
        current: 0,
        next: 1,
        total: this.images.length - 1,
        delta: 0
      }
      
      this.state = {
        animating: false,
        text: false,
        initial: true
      }
      
      this.textures = null
      
      this.init()
    }
    
    bindAll() {
      ['render', 'nextSlide']
      .forEach(fn => this[fn] = this[fn].bind(this))
    }
    
    setStyles() {
      this.slides.forEach((slide, index) => {
        if (index === 0) return
        
        TweenMax.set(slide, { autoAlpha: 0 })
      })
      
      this.bullets.forEach((bullet, index) => {
        if (index === 0) return
        
        const txt = bullet.querySelector('.js-slider-bullet__text')
        const line = bullet.querySelector('.js-slider-bullet__line')
        
        TweenMax.set(txt, {
          alpha: 0.25
        })
        TweenMax.set(line, {
          scaleX: 0,
          transformOrigin: 'left'
        })
      })
    }
    
    cameraSetup() {
      this.camera = new THREE.OrthographicCamera(
        this.el.offsetWidth / -2,
        this.el.offsetWidth / 2,
        this.el.offsetHeight / 2,
        this.el.offsetHeight / -2,
        1,
        1000
      )
  
      this.camera.lookAt(this.scene.position)
      this.camera.position.z = 1
    }
  
    setup() {
      this.scene = new THREE.Scene()
      this.clock = new THREE.Clock(true)
      
      this.renderer = new THREE.WebGLRenderer({ alpha: true })
      this.renderer.setPixelRatio(window.devicePixelRatio)
      this.renderer.setSize(this.el.offsetWidth, this.el.offsetHeight)
      
      this.inner.appendChild(this.renderer.domElement)
    }
    
    loadTextures() {
      const loader = new THREE.TextureLoader()
      loader.crossOrigin = ''
      
      this.textures = []
      this.images.forEach(image => {
        const texture = loader.load(image + '?v=' + Date.now(), this.render)
        
        texture.wrapS = THREE.ClampToEdgeWrapping
        texture.wrapT = THREE.ClampToEdgeWrapping
        texture.minFilter = THREE.LinearFilter
        
        this.textures.push(texture)
      })
      
      this.disp = loader.load('./rock-disp.png', this.render)
      this.disp.magFilter = this.disp.minFilter = THREE.LinearFilter
      this.disp.wrapS = this.disp.wrapT = THREE.RepeatWrapping
    }
    
    createMesh() {
      this.mat = new THREE.ShaderMaterial( {
        uniforms: {
          dispPower: { type: 'f', value: 0.5 },
          intensity: { type: 'f', value: 0.5 },
        //   texture1: { type: 't', value: this.textures[0] },
          texture2: { type: 't', value: this.textures[1] },
        //   texture1: { type: 't', value: this.textures[1] },
          disp: { type: 't', value: this.disp }
        },
        // transparent: true,
        vertexShader: this.vert,
        fragmentShader: this.frag
      })
  
      const geometry = new THREE.PlaneBufferGeometry(
        this.el.offsetWidth, 
        this.el.offsetHeight, 
        1
      )
      
      const mesh = new THREE.Mesh(geometry, this.mat)
  
      this.scene.add(mesh)    
    }
    
    transitionNext() {
      TweenMax.to(this.mat.uniforms.dispPower, 2.5, {
        value: 1,
        ease: Expo.easeInOut,
        onUpdate: this.render,
        onComplete: () => {
          this.mat.uniforms.dispPower.value = 0.0
          this.changeTexture()
          this.render.bind(this)
          this.state.animating = false
        }
      })
      
      const current = this.slides[this.data.current]
      const next = this.slides[this.data.next]
      
      
      const tl = new TimelineMax({ paused: true })
      tl
      .staggerFromTo(currentImages, 1.5, {
        yPercent: 0,
        scale: 1
      }, {
        yPercent: -185,
        scaleY: 1.5,
        ease: Expo.easeInOut
      }, 0.075)
      .to(currentBulletTxt, 1.5, {
        alpha: 0.25,
        ease: Linear.easeNone
      }, 0)
      .set(currentBulletLine, {
        transformOrigin: 'right'
      }, 0)
      .to(currentBulletLine, 1.5, {
        scaleX: 0,
        ease: Expo.easeInOut
      }, 0)
      
      if (currentText) {
        tl
        .fromTo(currentText, 2, {
          yPercent: 0
        }, {
          yPercent: -100,
          ease: Power4.easeInOut
        }, 0)  
      }
      
      tl
      .set(current, {
        autoAlpha: 0
      })
      .set(next, {
        autoAlpha: 1
      }, 1)
      
      if (nextText) {
        tl
        .fromTo(nextText, 2, {
          yPercent: 100
        }, {
          yPercent: 0,
          ease: Power4.easeOut
        }, 1.5)  
      }
      
      tl
      .staggerFromTo(nextImages, 1.5, {
        yPercent: 150,
        scaleY: 1.5
      }, {
        yPercent: 0,
        scaleY: 1,
        ease: Expo.easeInOut
      }, 0.075, 1)
      .to(nextBulletTxt, 1.5, {
        alpha: 1,
        ease: Linear.easeNone
      }, 1)
      .set(nextBulletLine, {
        transformOrigin: 'left'
      }, 1)
      .to(nextBulletLine, 1.5, {
        scaleX: 1,
        ease: Expo.easeInOut
      }, 1)
      
      tl.play()
    }
    
    prevSlide() {
      
    }
    
    nextSlide() {
      if (this.state.animating) return
      
      this.state.animating = true
      
      this.transitionNext()
      
      this.data.current = this.data.current === this.data.total ? 0 : this.data.current + 1
      this.data.next = this.data.current === this.data.total ? 0 : this.data.current + 1
    }
    
    changeTexture() {
      this.mat.uniforms.texture1.value = this.textures[this.data.current]
      this.mat.uniforms.texture2.value = this.textures[this.data.next]
    }
   
    listeners() {
      window.addEventListener('click', this.nextSlide, { passive: true })
    }
    
    render() {
      this.renderer.render(this.scene, this.camera)
    }
    
    init() {
      this.setup()
      this.cameraSetup()
      this.loadTextures()
      this.createMesh()
      this.setStyles()
      this.render()
      this.listeners()
    }
  }
  
  const slider = new Slider()