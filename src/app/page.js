// this is stabel and fast code
'use client'

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

const ThreejsOLD = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const DlightRef = useRef(null);
  const planeRef = useRef(null);
  const [modelFile, setModelFile] = useState(null);
  const [model, setModel] = useState(null);
  const [defaultModel, setDefaultModel] = useState(null);
  const [lightPosition, setLightPosition] = useState({ x: -4, y: 4, z: 5 });
  const [shadowOpacity, setShadowOpacity] = useState(0.3);
  const [shadowBlur, setShadowBlur] = useState(1);
  const [selectedMesh, setSelectedMesh] = useState(null);
  const [modelBounds, setModelBounds] = useState(null);
  const [selectedColorMesh, setSelectedColorMesh] = useState(null);
  const [colorChanged, setColorChanged] = useState(false);
  const [colorableMeshes, setColorableMeshes] = useState([]);
  const [modelColor, setModelColor] = useState("#ffffff");

  const [OrbitControls0, setOrbitControls0] = useState(true);
  const OrbitControlRef = useRef(null);
  const BackimgRef = useRef(null);

  const [saveCam, setsaveCam] = useState([]);

  const [zoom, setZoom] = useState(50);

  const [radius, setRadius] = useState(2);
  const [azimuth, setAzimuth] = useState(0);
  const [polar, setPolar] = useState(Math.PI / 2);
  const [rendersize, setrendersize] = useState();
  const [OrthographicView, setOrthographicView] = useState(false);

  const [bgImg,setbgImg] = useState(null);

  useEffect(() => {
    const currentMount = mountRef.current;

    const scene = new THREE.Scene();
    handleBackgroundImageChange(bgImg) // set the bg-img on load
    scene.background = new THREE.Color("#ead1a0");
    sceneRef.current = scene;

    let camera;

    if (OrthographicView == true) {
      camera = new THREE.OrthographicCamera(
        -currentMount.clientWidth / 2,
        currentMount.clientWidth / 2,
        currentMount.clientHeight / 2,
        -currentMount.clientHeight / 2,
        1,
        1000
      );
      camera.position.set(0, 0, 10);
      camera.zoom = 300
      cameraRef.current = camera;
      // setOrbitControls0(false);
    } else if (OrthographicView == false) {
      camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.01, 1000);
      camera.position.set(0, 0.2, 2);
      // setOrbitControls0(true);
    }
    
    cameraRef.current = camera;


    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      preserveDrawingBuffer: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    currentMount.appendChild(renderer.domElement);
    setrendersize({ width: currentMount.clientWidth, height: currentMount.clientHeight })
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0x404040, 45);
    scene.add(ambientLight);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new RGBELoader().load('forest new 2.hdr', (texture) => {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      scene.environment = envMap;
      texture.dispose();
      pmremGenerator.dispose();
    })

    const Dlight = new THREE.DirectionalLight(0xffffff, 0);
    Dlight.position.set(lightPosition.x, lightPosition.y, lightPosition.z);
    Dlight.castShadow = true;
    Dlight.target.position.set(0, 0, 0);
    scene.add(Dlight.target);

    Dlight.shadow.mapSize.width = 1024;
    Dlight.shadow.mapSize.height = 1024;
    Dlight.shadow.camera.near = 0.01;
    Dlight.shadow.camera.far = 50; // Set a fixed shadow depth
    Dlight.shadow.bias = -0.0001; // Reduce shadow artifacts
    Dlight.shadow.radius = shadowBlur;

    scene.add(Dlight);
    DlightRef.current = Dlight;

    const planeGeometry = new THREE.PlaneGeometry(500, 500);
    const planeMaterial = new THREE.ShadowMaterial({
      opacity: shadowOpacity,
      color: "0xff0000",
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    planeRef.current = plane;

    // Initial position - will be updated when model loads
    if (modelBounds) {
      updatePlanePosition(modelBounds);
    }
    scene.add(plane);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enabled = OrbitControls0;
    controls.screenSpacePanning = false;
    OrbitControlRef.current = controls;

    const loader = new GLTFLoader();
    const loadModel = (gltf) => {
      gltf.scene.traverse((child) => {
        child.frustumCulled = false;
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          child.material.flatShading = false;
          child.material.needsUpdate = true;
          child.geometry.computeVertexNormals();

          // Improve material quality
          if (child.material) {
            child.material.precision = "highp";
            child.material.roughness = 0.2;
            child.material.metalness = 0.2;
            // child.material.specular = 0;
            // child.material.shininess = 0;
            if (child.material.map) {
              child.material.map.anisotropy =
                renderer.capabilities.getMaxAnisotropy();
              child.material.map.minFilter = THREE.LinearFilter;
              child.material.map.magFilter = THREE.LinearFilter;
              child.material.map.generateMipmaps = true;
              child.material.map.colorSpace = THREE.SRGBColorSpace;
            }
          }
        }
      });

      scene.add(gltf.scene);

      // Calculate model bounds
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      gltf.scene.position.sub(center);

      setModelBounds(box);

      // Update plane position based on new bounds
      if (planeRef.current) {
        updatePlanePosition(box);
      }

      return gltf.scene;
    };

    if (!modelFile) {
      loader.load("/Protein Supplement Long Jar Stack.glb", (gltf) => {
        const modelScene = loadModel(gltf);
        setDefaultModel(modelScene);
        setModel(modelScene);
      });
    }

    if (modelFile) {
      if (defaultModel) {
        scene.remove(defaultModel);
        setDefaultModel(null);
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        loader.parse(event.target.result, "", (gltf) => {
          const modelScene = loadModel(gltf);
          setModel(modelScene);
        });
      };
      reader.readAsArrayBuffer(modelFile);
    }


    const animate = () => {
      controls.update();
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const width = currentMount.clientWidth;
      const height = currentMount.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);
    handleResize(); // Call once to set initial size

    return () => {
      if (currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
      window.removeEventListener("resize", handleResize);
      setDefaultModel(null);
      renderer.dispose();
    };
  }, [modelFile, OrthographicView]);

  useEffect(() => {
    if (DlightRef.current) {
      DlightRef.current.position.set(
        lightPosition.x,
        lightPosition.y,
        lightPosition.z
      );
    }
  }, [lightPosition]);

  useEffect(() => {
    if (planeRef.current) {
      planeRef.current.material.opacity = shadowOpacity;
    }
  }, [shadowOpacity]);

  useEffect(() => {
    if (planeRef.current) {
      planeRef.current.material.needsUpdate = true;
    }
  }, [shadowBlur]);

  useEffect(() => {
    if (model) {
      setSelectedMesh(null); // Reset selected mesh when model changes
      setModelColor("#ffffff");
    }
  }, [model]);

  useEffect(() => {
    if (modelBounds) {
      updatePlanePosition(modelBounds);
    }
  }, [modelBounds]);

  useEffect(() => {
    OrbitControlRef.current.enabled = OrbitControls0;
    console.log(sceneRef.current);

  }, [OrbitControls0]);

  useEffect(() => {
    if (model) {
      const meshesWithoutTexture = [];
      model.traverse((child) => {
        if (child.isMesh) {
          if (Array.isArray(child.material)) {
            if (child.material.some((mat) => !mat.map)) {
              meshesWithoutTexture.push(child);
            }
          } else if (child.material && !child.material.map) {
            meshesWithoutTexture.push(child);
          }
        }
      });
      setColorableMeshes(meshesWithoutTexture);
    }
  }, [model]);

  const handleFileChange = (event) => {
    setModelFile(event.target.files[0]);
    setSelectedMesh(null);
    setColorChanged(false); // Reset color changed flag for new model
  };

  const handleMeshSelection = (event) => {
    const selectedMeshName = event.target.value;

    if (model) {
      const mesh = model.getObjectByName(selectedMeshName);
      setSelectedMesh(mesh);
    }
  };

  const handleTextureChange = (event) => {
    if (selectedMesh) {
      const file = event?.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const texture = new THREE.TextureLoader().load(e.target.result);
        texture.flipY = false;
        texture.minFilter = THREE.LinearFilter;
        texture.anisotropy =
          rendererRef.current.capabilities.getMaxAnisotropy();
        texture.colorSpace = THREE.SRGBColorSpace;
        selectedMesh.material.map = texture;
        selectedMesh.material.needsUpdate = true;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadImage = (format) => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    const { width, height } = rendersize;

    const originalBackground = scene.background;
    scene.background = null;

    renderer.setSize(2048, 2048);

    if (format === "png") {
      renderer.render(scene, camera);
      const link = document.createElement("a");
      link.href = renderer.domElement.toDataURL("image/png", 1.0);
      link.download = "model.png";
      link.click();
    }
    scene.background = originalBackground;
    renderer.setSize(width, height);
  };

  const handleLightPositionChange = (axis, value) => {
    setLightPosition((prev) => {
      const newPosition = { ...prev, [axis]: value };
      if (DlightRef.current) {
        DlightRef.current.position.set(
          newPosition.x,
          newPosition.y,
          newPosition.z
        );
        DlightRef.current.target.position.set(0, 0, 0);
      }
      return newPosition;
    });
  };

  const handleShadowOpacityChange = (value) => {
    const newOpacity = parseFloat(value);
    setShadowOpacity(newOpacity);
    if (planeRef.current) {
      planeRef.current.material.opacity = newOpacity;
      planeRef.current.material.needsUpdate = true;
    }
  };

  const handleShadowBlurChange = (value) => {
    const newBlur = parseFloat(value);
    setShadowBlur(newBlur);
    if (DlightRef.current) {
      DlightRef.current.shadow.radius = newBlur;
    }
  };

  const updatePlanePosition = (bounds) => {
    if (!planeRef.current || !bounds) return;

    const modelHeight = bounds.max.y - bounds.min.y;
    const offset = modelHeight * 0.5;
    planeRef.current.position.y = bounds.min.y - offset;
  };

  const handleColorChange = (event) => {
    const newColor = event.target.value;
    setModelColor(newColor);

    if (selectedColorMesh && selectedColorMesh.isMesh) {
      if (Array.isArray(selectedColorMesh.material)) {
        selectedColorMesh.material.forEach((mat) => {
          if (!mat.map) {
            mat.color.setStyle(newColor);
            mat.needsUpdate = true;
          }
        });
      } else if (
        selectedColorMesh.material &&
        !selectedColorMesh.material.map
      ) {
        selectedColorMesh.material.color.setStyle(newColor);
        selectedColorMesh.material.needsUpdate = true;
      }
    }
  };

  const handleColorMeshSelect = (event) => {
    const meshName = event.target.value;
    const selected = colorableMeshes.find((mesh) => mesh.name === meshName);
    setSelectedColorMesh(selected);
  };

  const handleSavePosition = () => {
    setsaveCam([
      ...saveCam,
      {
        position: cameraRef.current.position.clone(),
        rotation: cameraRef.current.rotation.clone(),
      },
    ]);
  };

  // camera controllers 
  const handleChangePosition = (event) => {
    const selectedIndex = event.target.value;
    if (selectedIndex !== "") {
      const selectedPosition = saveCam[selectedIndex];
      cameraRef.current.position.copy(selectedPosition.position);
      cameraRef.current.rotation.copy(selectedPosition.rotation);
    }
  };

  const handleZoomChange = (event) => {
    const newZoom = parseInt(event.target.value);
    setZoom(newZoom);

    // Convert zoom to radius (inverse relationship)
    const newRadius = 10 - (newZoom / 11);
    setRadius(newRadius);

    // Recalculate position using current angles and new radius
    const x = newRadius * Math.sin(polar) * Math.cos(azimuth);
    const z = newRadius * Math.sin(polar) * Math.sin(azimuth);
    const y = newRadius * Math.cos(polar);

    // Update camera position
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(0, 0, 0);
  };

  const handleAzimuthChange = (event) => {
    const angle = parseFloat(event.target.value) * Math.PI / 180;
    setAzimuth(angle);
    // Calculate new position on sphere
    const x = radius * Math.sin(polar) * Math.cos(angle);
    const z = radius * Math.sin(polar) * Math.sin(angle);
    const y = radius * Math.cos(polar);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(0, 0, 0);
  };

  const handlePolarChange = (event) => {
    const angle = parseFloat(event.target.value) * Math.PI / 180;
    setPolar(angle);
    // Calculate new position on sphere
    const x = radius * Math.sin(angle) * Math.cos(azimuth);
    const z = radius * Math.sin(angle) * Math.sin(azimuth);
    const y = radius * Math.cos(angle);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(0, 0, 0);
  };

  const handleBackgroundImageChange = (event) => {
    const file = event?.target?.files[0]; 

    setbgImg(event);

    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const texture = new THREE.TextureLoader().load(e.target.result);
        
        texture.colorSpace = THREE.SRGBColorSpace;
        
        sceneRef.current.background = texture;
      };
      reader.readAsDataURL(file);
    }
  };


  return (
    <>
      <div style={{ display: "flex", alignContent: "space-between", height: "90vh", width: "120vh", padding: "10px" }}>
        <div style={{ padding: "10px", fontFamily: "Arial, sans-serif" }}>
          <label>
            Select Model :
            <input
              type="file"
              accept=".glb"
              onChange={handleFileChange}
              disabled={OrthographicView}
              style={{ marginBottom: "10px" }}
            />
          </label>

          <div style={{ marginBottom: "10px" }}>
            <label>
              Select Mesh:
              <select
                onChange={handleMeshSelection}
                style={{ marginLeft: "10px" }}
              >
                <option>select mesh</option>
                {model &&
                  model.children
                    .filter((child) => child.isMesh)
                    .map((child) => (
                      <option key={child.name} value={child.name}>
                        {child.name}
                      </option>
                    ))}
              </select>
            </label>
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label>Texture:</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleTextureChange}
              disabled={!selectedMesh}
              style={{ marginLeft: "10px" }}
            />
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Light X:
              <input
                type="range"
                min="-20"
                max="20"
                step="0.5"
                value={lightPosition.x}
                onChange={(e) => handleLightPositionChange("x", e.target.value)}
                style={{ marginLeft: "10px", verticalAlign: "middle" }}
              />
              {" " + lightPosition.x}
            </label>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Light Y:
              <input
                type="range"
                min="-20"
                max="20"
                step="0.5"
                value={lightPosition.y}
                onChange={(e) => handleLightPositionChange("y", e.target.value)}
                style={{ marginLeft: "10px", verticalAlign: "middle" }}
              />
              {" " + lightPosition.y}
            </label>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Light Z:
              <input
                type="range"
                min="-20"
                max="20"
                step="0.5"
                value={lightPosition.z}
                onChange={(e) => handleLightPositionChange("z", e.target.value)}
                style={{ marginLeft: "10px", verticalAlign: "middle" }}
              />
              {" " + lightPosition.z}
            </label>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Shadow Opacity:
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={shadowOpacity}
                onChange={(e) => handleShadowOpacityChange(e.target.value)}
                style={{ marginLeft: "10px", verticalAlign: "middle" }}
              />
              {" " + shadowOpacity}
            </label>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Shadow Blur:
              <input
                type="range"
                min="0"
                max="5"
                step="0.2"
                value={shadowBlur}
                onChange={(e) => handleShadowBlurChange(e.target.value)}
                style={{ marginLeft: "10px", verticalAlign: "middle" }}
              />
              {" " + shadowBlur}
            </label>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label>
              Select Mesh to Color:
              <select
                onChange={handleColorMeshSelect}
                style={{ marginLeft: "10px", marginRight: "10px" }}
                value={selectedColorMesh?.name || ""}
              >
                <option value="">Select mesh</option>
                {colorableMeshes.map((mesh) => (
                  <option key={mesh.name} value={mesh.name}>
                    {mesh.name}
                  </option>
                ))}
              </select>
              <input
                type="color"
                value={modelColor}
                onChange={handleColorChange}
                disabled={!selectedColorMesh}
                style={{ verticalAlign: "middle" }}
              />
            </label>
          </div>

          <div style={{ marginBottom: "10px" }} >
            <label>
              Select Background Image:
              <input
                type="file"
                accept=".jpg, .png"
                onChange={handleBackgroundImageChange}
                style={{ marginBottom: "10px" }}
              />
            </label>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <button  onClick={() => setOrbitControls0(!OrbitControls0)}>
              OrbitControls {OrbitControls0 ? "on" : "off"}{" "}
            </button>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <button onClick={() => { setOrthographicView(!OrthographicView) }}>
              Orthographic view {OrthographicView ? "on" : "off"}
            </button>
          </div>


          <button style={{ marginBottom: "10px" }} onClick={handleSavePosition}>
            Save Model Position
          </button>

          <label style={{ margin: "10px", display: "flex" }}>
            Set Model Position
            <select onChange={handleChangePosition} disabled={OrthographicView}>
              <option value="">Select Position</option>
              {saveCam.map((p, indx) => (
                <option key={indx} value={indx}>{`Position ${indx + 1
                  }`}</option>
              ))}
            </select>
          </label>

          <div style={{ margin: '10px' }}>
            <label>Zoom</label>
            <input
              type="range"
              min="1"
              max="100"
              value={zoom}
              disabled={OrthographicView}
              onChange={handleZoomChange}
            />
            {" " + zoom}
          </div>

          <div style={{ margin: '10px' }}>
            <label>Horizontal Rotation </label>
            <input
              type="range"
              min="0"
              max="360"
              value={azimuth * 180 / Math.PI}
              disabled={OrthographicView}
              onChange={handleAzimuthChange}
            />
          </div>
          <div style={{ margin: '10px' }}>
            <label>Vertical Rotation</label>
            <input
              type="range"
              min="0"
              max="180"
              value={polar * 180 / Math.PI}
              disabled={OrthographicView}
              onChange={handlePolarChange}
            />
          </div>
          <button
            onClick={() => console.log(cameraRef.current)}
            style={{ marginBottom: "10px" }}
          >
            Get camera
          </button>

          <button
            onClick={() => handleDownloadImage("png")}
            style={{ marginBottom: "10px" }}
          >
            Download PNG
          </button>
        </div>
        <div
          ref={mountRef}
          style={{
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            border: "1px solid #ccc"
          }}
        />
      </div>
    </>
  );
};

export default ThreejsOLD;
