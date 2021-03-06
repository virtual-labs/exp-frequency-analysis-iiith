"use strict";

import data, { instructions } from "./data.js";

let currentInstructionIndex = -1;
let sleepTime = 3500;

const setInstruction = (index) => {
  if (index < instructions.length && currentInstructionIndex < index) {
    currentInstructionIndex = index;
    document.getElementById("instructions").innerHTML =
      instructions[currentInstructionIndex].message;

    instructions[currentInstructionIndex].elementId.forEach((id, ind) => {
      if (ind === 0)
        document.getElementById(id).scrollIntoView({
          behavior: "smooth",
        });
      document.getElementById(id).classList.add("highlight");
    });
    sleep(sleepTime - 600).then(() =>
      instructions[currentInstructionIndex].elementId.forEach((id) =>
        document.getElementById(id).classList.remove("highlight")
      )
    );
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const setMultipleInstructions = (indexes) =>
  indexes.forEach((val, ind) =>
    sleep(sleepTime * ind).then(() => setInstruction(val))
  );

const truncateFloat = (num) => Math.round(num * 1000000) / 1000000;

const generateXYZData = () => {
  const frames = 30;
  Object.keys(data).forEach((state) => {
    const XYZData = {};
    const datas = data[state];
    datas.frequencies.forEach((item, ind) => {
      const geometry = [];
      const prep = {};
      item.displacement.forEach((disp) => {
        prep[disp.atom - 1] = {
          x: {
            min: datas.positions[disp.atom - 1].x - disp.x,
            max: datas.positions[disp.atom - 1].x + disp.x,
            step: (2 * disp.x) / frames,
          },
          y: {
            min: datas.positions[disp.atom - 1].y - disp.y,
            max: datas.positions[disp.atom - 1].y + disp.y,
            step: (2 * disp.y) / frames,
          },
          z: {
            min: datas.positions[disp.atom - 1].z - disp.z,
            max: datas.positions[disp.atom - 1].z + disp.z,
            step: (2 * disp.z) / frames,
          },
        };
      });

      for (let i = 0; i <= frames; i++) {
        let str = `${datas.positions.length}\n `;
        for (let j = 0; j < datas.positions.length; j++) {
          str += `\n${datas.positions[j].element}   ${truncateFloat(
            prep[j].x.min + prep[j].x.step * i
          )}  ${truncateFloat(
            prep[j].y.min + prep[j].y.step * i
          )}  ${truncateFloat(prep[j].z.min + prep[j].z.step * i)}`;
        }
        geometry.push(str);
      }

      XYZData[item.freq] = geometry;
    });
    data[state]["geometries"] = XYZData;
  });
  console.log(data);
};

generateXYZData();

let state = "Reactants";
let frequency = Object.keys(data[state]["frequencies"])[0];

let myChart = null;

const initChart = () => {
  const xyValues = Object.keys(data).map((key) => ({
    x: key,
    y: data[key]["energy"],
  }));

  if (myChart) myChart.destroy();
  myChart = new Chart("myChart", {
    type: "line",
    data: {
      labels: xyValues.map((e) => e.x),
      datasets: [
        {
          data: xyValues.map((e) => e.y),
          fill: false,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: "rgb(0,0,255)",
          pointBorderColor: "rgb(133, 193, 233)",
        },
      ],
    },
    options: {
      legend: { display: false },
      scales: {
        xAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: "States",
            },
            offset: true,
          },
        ],
        yAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: "Energy (Ha)",
            },
            offset: true,
          },
        ],
      },
      onClick: (evt) => {
        const points = myChart.getElementsAtEventForMode(
          evt,
          "nearest",
          { intersect: true },
          true
        );
        if (points.length) {
          setInstruction(1);
          const firstPoint = points[0];
          const tmpState = myChart.data.labels[firstPoint._index];
          if (tmpState !== state) {
            state = tmpState;
            frequency = Object.keys(data[state]["frequencies"])[0];
            triggerUpdate();
          }
        }
      },
    },
  });
};

const highlightChart = () => {
  if (myChart) {
    myChart.data.datasets[0].pointBackgroundColor = [];
    myChart.data.datasets[0].pointRadius = [];
    for (let i = 0; i < myChart.data.datasets[0].data.length; i++) {
      if (myChart.data.datasets[0].data[i] === data[state]["energy"]) {
        myChart.data.datasets[0].pointRadius[i] = 5;
        myChart.data.datasets[0].pointBackgroundColor[i] = "red";
      } else {
        myChart.data.datasets[0].pointBackgroundColor[i] = "rgb(75, 192, 192)";
      }
    }
    myChart.update();
  }
};

let width = 600,
  height = 300;
if (window.innerWidth < 900) {
  width = window.innerWidth;
  height = 300;
}
let movie = new ChemDoodle.MovieCanvas3D("element", width, height);

const setMolecule = (freq) => {
  movie.clear();
  movie.frames = [];
  if (data !== null) {
    data[state]["geometries"][freq].forEach((geometry) =>
      movie.addFrame([ChemDoodle.readXYZ(geometry)], [])
    );
    movie.styles.set3DRepresentation("Ball and Stick");
    movie.styles.atoms_displayLabels_3D = true;
    movie.styles.backgroundColor = "transparent";
    movie.loadMolecule(movie.frames[0].mols[0]);
    movie.startAnimation();
  }
  return movie;
};

const renderButtons = () => {
  document.querySelector("#buttons").innerHTML = Object.keys(
    data[state]["geometries"]
  )
    .map((freq) => `<div class="v-chip">${freq}</div>`)
    .join(" ");

  const firstButton = document.querySelectorAll("#buttons .v-chip")[0];
  firstButton.classList.add("active");
  frequency = parseFloat(firstButton.innerHTML);
  setMolecule(frequency);

  document.querySelectorAll("#buttons .v-chip").forEach((button, ind) => {
    button.addEventListener("click", () => {
      setMultipleInstructions([2, 3, 4]);
      document
        .querySelectorAll("#buttons .v-chip.active")
        .forEach((activeButton) => activeButton.classList.remove("active"));
      button.classList.add("active");
      frequency = parseFloat(button.innerHTML);
      setMolecule(frequency);
    });
  });
};

const triggerUpdate = () => {
  highlightChart();
  renderButtons();
};

initChart();
triggerUpdate();
setInstruction(0);
