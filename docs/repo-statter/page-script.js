
(function() {
  // Make ApexCharts and d3 available to the bundle
  window.ApexCharts = window.ApexCharts || {};
  window.d3 = window.d3 || {};
  
  "use strict";
var PageScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/chart/page-script.ts
  var page_script_exports = {};
  __export(page_script_exports, {
    PageScript: () => PageScript,
    initializePageScript: () => initializePageScript
  });

  // src/utils/chart-data-builders.ts
  function buildUserTimeSeriesData(userCommits, xAxis, metric, filteredTimeSeries) {
    const addedData = [];
    const removedData = [];
    const netData = [];
    if (xAxis === "date" && filteredTimeSeries) {
      let cumulativeAdded = 0;
      let cumulativeRemoved = 0;
      let cumulativeBytesAdded = 0;
      let cumulativeBytesRemoved = 0;
      const userCommitsByDate = {};
      userCommits.forEach((commit) => {
        const dateKey = new Date(commit.date).toISOString().split("T")[0];
        if (!userCommitsByDate[dateKey]) {
          userCommitsByDate[dateKey] = [];
        }
        userCommitsByDate[dateKey].push(commit);
      });
      const sortedDates = filteredTimeSeries.map((point) => point.date);
      let firstUserCommitDate = null;
      for (const date of sortedDates) {
        const dateKey = date.split("T")[0];
        if (userCommitsByDate[dateKey] && userCommitsByDate[dateKey].length > 0) {
          firstUserCommitDate = date;
          break;
        }
      }
      if (firstUserCommitDate) {
        const firstCommitDate = new Date(firstUserCommitDate);
        const startDate = new Date(firstCommitDate);
        const firstDate = new Date(sortedDates[0]);
        const lastDate = new Date(sortedDates[sortedDates.length - 1]);
        const repoAgeHours = (lastDate.getTime() - firstDate.getTime()) / (1e3 * 60 * 60);
        const useHourlyData = repoAgeHours < 48;
        if (useHourlyData) {
          startDate.setHours(startDate.getHours() - 1);
        } else {
          startDate.setDate(startDate.getDate() - 1);
        }
        const startTimestamp = startDate.getTime();
        addedData.push({ x: startTimestamp, y: 0 });
        removedData.push({ x: startTimestamp, y: 0 });
        netData.push({ x: startTimestamp, y: 0 });
      }
      sortedDates.forEach((date) => {
        if (firstUserCommitDate && new Date(date) < new Date(firstUserCommitDate)) {
          return;
        }
        const dateKey = date.split("T")[0];
        const dateContributions = userCommitsByDate[dateKey] ?? [];
        const dayAdded = dateContributions.reduce((sum, c) => sum + c.linesAdded, 0);
        const dayRemoved = dateContributions.reduce((sum, c) => sum + c.linesDeleted, 0);
        const dayBytesAdded = dateContributions.reduce((sum, c) => sum + (c.bytesAdded ?? c.linesAdded * 50), 0);
        const dayBytesRemoved = dateContributions.reduce((sum, c) => sum + (c.bytesDeleted ?? c.linesDeleted * 50), 0);
        cumulativeAdded += dayAdded;
        cumulativeRemoved += dayRemoved;
        cumulativeBytesAdded += dayBytesAdded;
        cumulativeBytesRemoved += dayBytesRemoved;
        const timestamp = new Date(date).getTime();
        if (metric === "lines") {
          addedData.push({ x: timestamp, y: cumulativeAdded });
          removedData.push({ x: timestamp, y: -cumulativeRemoved });
          netData.push({ x: timestamp, y: cumulativeAdded - cumulativeRemoved });
        } else {
          addedData.push({ x: timestamp, y: cumulativeBytesAdded });
          removedData.push({ x: timestamp, y: -cumulativeBytesRemoved });
          netData.push({ x: timestamp, y: cumulativeBytesAdded - cumulativeBytesRemoved });
        }
      });
    } else {
      let cumulativeAdded = 0;
      let cumulativeRemoved = 0;
      let cumulativeBytesAdded = 0;
      let cumulativeBytesRemoved = 0;
      userCommits.forEach((commit, i) => {
        const x = i;
        cumulativeAdded += commit.linesAdded;
        cumulativeRemoved += commit.linesDeleted;
        const bytesAdded = commit.bytesAdded ?? commit.linesAdded * 50;
        const bytesRemoved = commit.bytesDeleted ?? commit.linesDeleted * 50;
        cumulativeBytesAdded += bytesAdded;
        cumulativeBytesRemoved += bytesRemoved;
        if (metric === "lines") {
          addedData.push({ x, y: cumulativeAdded });
          removedData.push({ x, y: -cumulativeRemoved });
          netData.push({ x, y: cumulativeAdded - cumulativeRemoved });
        } else {
          addedData.push({ x, y: cumulativeBytesAdded });
          removedData.push({ x, y: -cumulativeBytesRemoved });
          netData.push({ x, y: cumulativeBytesAdded - cumulativeBytesRemoved });
        }
      });
    }
    return { addedData, removedData, netData };
  }

  // src/utils/errors.ts
  var RepoStatError = class extends Error {
    constructor(message, code, cause) {
      super(message);
      this.code = code;
      this.cause = cause;
      this.name = "RepoStatError";
    }
  };
  function formatError(error) {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
  function assert(condition, message) {
    if (!condition) {
      throw new RepoStatError(message, "ASSERTION_ERROR");
    }
  }

  // src/utils/error-boundary.ts
  function renderWithErrorBoundary(containerId, chartName, renderFunction) {
    try {
      renderFunction();
      return true;
    } catch (error) {
      console.error(`Failed to render ${chartName}:`, formatError(error));
      const container = document.querySelector(`#${containerId}`);
      if (container) {
        container.innerHTML = `
        <div class="alert alert-warning d-flex align-items-center" role="alert">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <div>
            <h6 class="alert-heading mb-1">Chart Unavailable</h6>
            <small>${chartName} could not be rendered. Please check the console for details.</small>
          </div>
        </div>
      `;
      }
      return false;
    }
  }

  // src/charts/contributors-chart.ts
  var ContributorsChart = class {
    constructor(containerId) {
      __publicField(this, "containerId");
      __publicField(this, "chart", null);
      this.containerId = containerId;
    }
    render(contributors) {
      assert(contributors !== void 0, "Contributors data is required");
      assert(Array.isArray(contributors), "Contributors must be an array");
      const container = document.querySelector("#" + this.containerId);
      assert(container !== null, `Container with id ${this.containerId} not found`);
      const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      const options = {
        chart: {
          type: "bar",
          height: 350,
          toolbar: { show: false },
          background: isDark ? "#161b22" : "#ffffff"
        },
        series: [{ name: "Commits", data: contributors.slice(0, 10).map((c) => c.commits) }],
        xaxis: {
          categories: contributors.slice(0, 10).map((c) => c.name),
          title: {
            text: "Contributors",
            style: { color: isDark ? "#f0f6fc" : "#24292f" }
          },
          labels: { style: { colors: isDark ? "#f0f6fc" : "#24292f" } }
        },
        yaxis: {
          title: {
            text: "Commits",
            style: { color: isDark ? "#f0f6fc" : "#24292f" }
          },
          labels: { style: { colors: isDark ? "#f0f6fc" : "#24292f" } }
        },
        colors: [isDark ? "#3fb950" : "#87bc45"],
        grid: { borderColor: isDark ? "#30363d" : "#e1e4e8" },
        tooltip: { theme: isDark ? "dark" : "light" }
      };
      this.chart = new window.ApexCharts(container, options);
      this.chart.render();
    }
    destroy() {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
    }
  };

  // src/charts/file-types-chart.ts
  var FileTypesChart = class {
    constructor(containerId) {
      __publicField(this, "containerId");
      __publicField(this, "chart", null);
      this.containerId = containerId;
    }
    render(fileTypes) {
      assert(fileTypes !== void 0, "File types data is required");
      assert(Array.isArray(fileTypes), "File types must be an array");
      const container = document.querySelector("#" + this.containerId);
      assert(container !== null, `Container with id ${this.containerId} not found`);
      const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      const options = {
        chart: {
          type: "donut",
          height: 350,
          background: isDark ? "#161b22" : "#ffffff"
        },
        series: fileTypes.slice(0, 8).map((ft) => ft.lines),
        labels: fileTypes.slice(0, 8).map((ft) => ft.type),
        colors: isDark ? ["#58a6ff", "#3fb950", "#f85149", "#d29922", "#a5a5ff", "#56d4dd", "#db6d28", "#8b949e"] : ["#27aeef", "#87bc45", "#ea5545", "#ef9b20", "#b33dc6", "#f46a9b", "#ede15b", "#bdcf32"],
        legend: {
          labels: { colors: isDark ? "#f0f6fc" : "#24292f" }
        },
        tooltip: { theme: isDark ? "dark" : "light" }
      };
      this.chart = new window.ApexCharts(container, options);
      this.chart.render();
    }
    destroy() {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
    }
  };

  // src/charts/growth-chart.ts
  function formatBytes(bytes) {
    if (bytes >= 1e9) {
      return (bytes / 1e9).toFixed(2) + " GB";
    } else if (bytes >= 1e6) {
      return (bytes / 1e6).toFixed(2) + " MB";
    } else if (bytes >= 1e3) {
      return (bytes / 1e3).toFixed(2) + " KB";
    } else {
      return bytes.toFixed(0) + " bytes";
    }
  }
  var GrowthChart = class {
    constructor(containerId) {
      __publicField(this, "containerId");
      __publicField(this, "chart", null);
      this.containerId = containerId;
    }
    render(linearSeries, timeSeries, xAxis, commits) {
      assert(linearSeries !== void 0, "Linear series data is required");
      assert(timeSeries !== void 0, "Time series data is required");
      assert(Array.isArray(linearSeries), "Linear series must be an array");
      assert(Array.isArray(timeSeries), "Time series must be an array");
      assert(xAxis === "date" || xAxis === "commit", 'X-axis must be "date" or "commit"');
      assert(commits !== void 0, "Commits data is required");
      assert(Array.isArray(commits), "Commits must be an array");
      const container = document.querySelector("#" + this.containerId);
      assert(container !== null, `Container with id ${this.containerId} not found`);
      const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
      const linesData = xAxis === "date" ? timeSeries.map((point) => ({
        x: new Date(point.date).getTime(),
        y: point.cumulativeLines
      })) : linearSeries.map((point) => ({
        x: point.commitIndex,
        y: point.cumulativeLines
      }));
      const bytesData = xAxis === "date" ? timeSeries.map((point) => ({
        x: new Date(point.date).getTime(),
        y: point.cumulativeBytes
      })) : linearSeries.map((point) => ({
        x: point.commitIndex,
        y: point.cumulativeBytes
      }));
      const options = {
        chart: {
          type: "area",
          height: 350,
          toolbar: { show: false },
          background: isDark ? "#161b22" : "#ffffff",
          zoom: {
            enabled: true,
            allowMouseWheelZoom: false
          }
        },
        series: [
          {
            name: "Lines of Code",
            data: linesData,
            yAxisIndex: 0
          },
          {
            name: "Repository Size",
            data: bytesData,
            yAxisIndex: 1
          }
        ],
        dataLabels: {
          enabled: false
        },
        stroke: {
          curve: "smooth",
          width: 2
        },
        xaxis: {
          type: xAxis === "date" ? "datetime" : "numeric",
          title: {
            text: xAxis === "date" ? "Date" : "Commit Number",
            style: { color: isDark ? "#f0f6fc" : "#24292f" }
          },
          labels: {
            datetimeFormatter: {
              year: "yyyy",
              month: "MMM yyyy",
              day: "dd MMM",
              hour: "HH:mm",
              minute: "HH:mm",
              second: "HH:mm:ss"
            },
            datetimeUTC: false,
            style: { colors: isDark ? "#f0f6fc" : "#24292f" },
            formatter: xAxis === "commit" ? function(val) {
              return Math.floor(val).toString();
            } : void 0
          }
        },
        yaxis: [
          {
            title: {
              text: "Lines of Code",
              style: { color: isDark ? "#f0f6fc" : "#24292f" }
            },
            min: 0,
            labels: {
              style: { colors: isDark ? "#f0f6fc" : "#24292f" },
              formatter: function(val) {
                return val.toLocaleString();
              }
            }
          },
          {
            opposite: true,
            title: {
              text: "Repository Size",
              style: { color: isDark ? "#f0f6fc" : "#24292f" }
            },
            min: 0,
            labels: {
              formatter: formatBytes,
              style: { colors: isDark ? "#f0f6fc" : "#24292f" }
            }
          }
        ],
        fill: {
          type: "gradient",
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.5,
            opacityTo: 0.7
          }
        },
        colors: [
          isDark ? "#f85149" : "#ea5545",
          // Lines of Code color
          isDark ? "#a5a5ff" : "#b33dc6"
          // Repository Size color
        ],
        legend: {
          position: "top",
          horizontalAlign: "left",
          labels: {
            colors: isDark ? "#f0f6fc" : "#24292f"
          }
        },
        tooltip: xAxis === "date" ? {
          theme: isDark ? "dark" : "light",
          enabled: true,
          shared: true,
          intersect: false,
          x: {
            format: "dd MMM yyyy"
          },
          y: [
            {
              formatter: function(val) {
                return val.toLocaleString() + " lines";
              }
            },
            {
              formatter: formatBytes
            }
          ]
        } : {
          theme: isDark ? "dark" : "light",
          custom: this.createCommitTooltip(xAxis, linearSeries, commits)
        },
        grid: {
          borderColor: isDark ? "#30363d" : "#e1e4e8"
        }
      };
      if (this.chart) {
        this.chart.destroy();
      }
      this.chart = new window.ApexCharts(container, options);
      this.chart.render();
    }
    destroy() {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
    }
    createCommitTooltip(xAxis, linearSeries, commits) {
      return ({ dataPointIndex }) => {
        if (xAxis === "commit") {
          const point = linearSeries[dataPointIndex];
          if (point && point.sha !== "start") {
            const commit = commits.find((c) => c.sha === point.sha);
            if (commit) {
              const truncateMessage = (msg, maxLength) => {
                if (msg.length <= maxLength) return msg;
                return msg.substring(0, maxLength) + "...";
              };
              let linesDisplay = "";
              const added = commit.linesAdded;
              const deleted = commit.linesDeleted;
              const net = point.netLines;
              if (added > 0) {
                linesDisplay += "+" + added;
              }
              if (deleted > 0) {
                if (linesDisplay !== "") {
                  linesDisplay += " / ";
                }
                linesDisplay += "-" + deleted;
              }
              let netDisplay = "";
              if (added > 0 && deleted > 0) {
                netDisplay = " (Net: " + (net > 0 ? "+" : "") + net + ")";
              } else if (added === 0 && deleted === 0) {
                linesDisplay = "0";
              }
              const bytesAdded = commit.bytesAdded || 0;
              const bytesDeleted = commit.bytesDeleted || 0;
              let bytesDisplay = "";
              if (bytesAdded > 0) {
                bytesDisplay += "+" + formatBytes(bytesAdded);
              }
              if (bytesDeleted > 0) {
                if (bytesDisplay !== "") {
                  bytesDisplay += " / ";
                }
                bytesDisplay += "-" + formatBytes(bytesDeleted);
              }
              if (bytesAdded === 0 && bytesDeleted === 0) {
                bytesDisplay = "0 bytes";
              }
              let content = '<div class="custom-tooltip"><div class="tooltip-title">Commit #' + point.commitIndex + '</div><div class="tooltip-content"><div><strong>SHA:</strong> ' + commit.sha.substring(0, 7) + "</div><div><strong>Author:</strong> " + commit.authorName + "</div><div><strong>Date:</strong> " + new Date(commit.date).toLocaleString() + '</div><div class="tooltip-message"><strong>Message:</strong> ' + truncateMessage(commit.message, 200) + "</div><div><strong>Lines:</strong> " + linesDisplay + netDisplay + "</div><div><strong>Total Lines:</strong> " + point.cumulativeLines.toLocaleString() + "</div><div><strong>Bytes:</strong> " + bytesDisplay + "</div><div><strong>Total Size:</strong> " + formatBytes(point.cumulativeBytes) + "</div></div></div>";
              return content;
            }
          }
        }
        return null;
      };
    }
  };

  // src/charts/commit-activity-chart.ts
  var CommitActivityChart = class {
    constructor(containerId) {
      __publicField(this, "containerId");
      __publicField(this, "chart", null);
      this.containerId = containerId;
    }
    render(timeSeries) {
      assert(timeSeries !== void 0, "Time series data is required");
      assert(Array.isArray(timeSeries), "Time series must be an array");
      const container = document.querySelector("#" + this.containerId);
      assert(container !== null, `Container with id ${this.containerId} not found`);
      const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      const data = timeSeries.map((point) => ({
        x: new Date(point.date).getTime(),
        y: point.commits
      }));
      const options = {
        chart: {
          type: "area",
          height: 350,
          toolbar: { show: false },
          background: isDark ? "#161b22" : "#ffffff",
          zoom: {
            enabled: true,
            allowMouseWheelZoom: false
          }
        },
        series: [{
          name: "Commits",
          data
        }],
        xaxis: {
          type: "datetime",
          title: {
            text: "Date",
            style: { color: isDark ? "#f0f6fc" : "#24292f" }
          },
          labels: {
            style: { colors: isDark ? "#f0f6fc" : "#24292f" }
          }
        },
        yaxis: {
          title: {
            text: "Commits",
            style: { color: isDark ? "#f0f6fc" : "#24292f" }
          },
          labels: { style: { colors: isDark ? "#f0f6fc" : "#24292f" } }
        },
        fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9 } },
        colors: [isDark ? "#58a6ff" : "#27aeef"],
        grid: { borderColor: isDark ? "#30363d" : "#e1e4e8" },
        tooltip: {
          theme: isDark ? "dark" : "light",
          enabled: true,
          shared: false,
          intersect: false,
          x: {
            format: "dd MMM yyyy"
          },
          y: {
            formatter: function(val) {
              return val.toLocaleString() + " commits";
            }
          }
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          curve: "smooth"
        }
      };
      this.chart = new window.ApexCharts(container, options);
      this.chart.render();
    }
    destroy() {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
    }
  };

  // src/charts/word-cloud-chart.ts
  var WordCloudChart = class {
    constructor(containerId) {
      __publicField(this, "containerId");
      this.containerId = containerId;
    }
    render(wordCloudData) {
      assert(wordCloudData !== void 0, "Word cloud data is required");
      assert(Array.isArray(wordCloudData), "Word cloud data must be an array");
      const container = document.querySelector("#" + this.containerId);
      assert(container !== null, `Container with id ${this.containerId} not found`);
      if (wordCloudData.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No commit messages to analyze</p>';
        return;
      }
      const width = container.offsetWidth;
      const height = 400;
      const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
      const colors = isDark ? ["#58a6ff", "#3fb950", "#f85149", "#d29922", "#a5a5ff", "#56d4dd", "#db6d28", "#8b949e"] : ["#27aeef", "#87bc45", "#ea5545", "#ef9b20", "#b33dc6", "#f46a9b", "#ede15b", "#bdcf32"];
      const color = window.d3.scaleOrdinal().range(colors);
      const draw = (words) => {
        window.d3.select("#" + this.containerId).append("svg").attr("width", width).attr("height", height).append("g").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")").selectAll("text").data(words).enter().append("text").style("font-size", function(d) {
          return d.size + "px";
        }).style("font-family", "'Inter', -apple-system, sans-serif").style("font-weight", function(d) {
          return d.size > 40 ? "600" : "400";
        }).style("fill", function(_d, i) {
          return color(i);
        }).attr("text-anchor", "middle").attr("transform", function(d) {
          return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        }).text(function(d) {
          return d.text;
        }).style("cursor", "default").each(function(d) {
          window.d3.select(this).append("title").text(d.text + ": " + Math.round(d.size));
        });
      };
      const layout = window.d3.layout.cloud().size([width, height]).words(wordCloudData.map(function(d) {
        return { text: d.text, size: d.size };
      })).padding(5).rotate(function() {
        return ~~(Math.random() * 2) * 90;
      }).font("'Inter', -apple-system, sans-serif").fontSize(function(d) {
        return d.size;
      }).on("end", draw);
      layout.start();
    }
    destroy() {
      const container = document.querySelector("#" + this.containerId);
      if (container) {
        container.innerHTML = "";
      }
    }
  };

  // src/charts/file-heatmap-chart.ts
  var FileHeatmapChart = class {
    constructor(containerId) {
      __publicField(this, "containerId");
      __publicField(this, "chart", null);
      this.containerId = containerId;
    }
    render(fileHeatData) {
      assert(fileHeatData !== void 0, "File heat data is required");
      assert(Array.isArray(fileHeatData), "File heat data must be an array");
      const container = document.querySelector("#" + this.containerId);
      assert(container !== null, `Container with id ${this.containerId} not found`);
      const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
      const data = fileHeatData.slice(0, 100).map((file) => ({
        x: file.fileName.split("/").pop() || file.fileName,
        y: file.totalLines
      }));
      const maxHeatScore = Math.max(...fileHeatData.slice(0, 100).map((f) => f.heatScore));
      const colors = fileHeatData.slice(0, 100).map((file) => {
        const intensity = file.heatScore / maxHeatScore;
        if (isDark) {
          const r = Math.floor(70 + intensity * 185);
          const g = Math.floor(70 - intensity * 50);
          const b = Math.floor(150 - intensity * 100);
          return `rgb(${r}, ${g}, ${b})`;
        } else {
          const r = Math.floor(100 + intensity * 155);
          const g = Math.floor(150 - intensity * 100);
          const b = Math.floor(255 - intensity * 155);
          return `rgb(${r}, ${g}, ${b})`;
        }
      });
      const options = {
        series: [{
          data
        }],
        chart: {
          type: "treemap",
          height: 400,
          toolbar: { show: false },
          background: isDark ? "#161b22" : "#ffffff"
        },
        colors,
        dataLabels: {
          enabled: true,
          style: {
            fontSize: "12px",
            colors: [isDark ? "#f0f6fc" : "#24292f"]
          },
          formatter: function(text, op) {
            const index = op.dataPointIndex;
            const file = fileHeatData[index];
            if (file && op.value > 100) {
              return [text, `${op.value} lines`];
            }
            return text;
          }
        },
        plotOptions: {
          treemap: {
            distributed: true,
            enableShades: false
          }
        },
        tooltip: {
          theme: isDark ? "dark" : "light",
          custom: ({ dataPointIndex }) => {
            const file = fileHeatData[dataPointIndex];
            if (file) {
              const lastModified = new Date(file.lastModified).toLocaleDateString();
              return `<div class="custom-tooltip">
              <div><strong>File:</strong> ${file.fileName}</div>
              <div><strong>Lines:</strong> ${file.totalLines.toLocaleString()}</div>
              <div><strong>Commits:</strong> ${file.commitCount}</div>
              <div><strong>Last Modified:</strong> ${lastModified}</div>
              <div><strong>Type:</strong> ${file.fileType}</div>
              <div><strong>Heat Score:</strong> ${file.heatScore.toFixed(2)}</div>
            </div>`;
            }
            return "";
          }
        },
        legend: { show: false }
      };
      if (this.chart) {
        this.chart.destroy();
      }
      this.chart = new window.ApexCharts(container, options);
      this.chart.render();
    }
    destroy() {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
    }
  };

  // src/charts/top-files-chart.ts
  var TopFilesChart = class {
    constructor(containerId) {
      __publicField(this, "containerId");
      __publicField(this, "chart", null);
      __publicField(this, "currentData", null);
      this.containerId = containerId;
    }
    render(topFilesData, activeTab = "largest") {
      assert(topFilesData !== void 0, "Top files data is required");
      const container = document.querySelector("#" + this.containerId);
      assert(container !== null, `Container with id ${this.containerId} not found`);
      this.currentData = topFilesData;
      const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      let data = [];
      let xAxisTitle = "";
      let color = "";
      switch (activeTab) {
        case "largest":
          data = topFilesData.largest;
          xAxisTitle = "Lines of Code";
          color = isDark ? "#58a6ff" : "#27aeef";
          break;
        case "churn":
          data = topFilesData.mostChurn;
          xAxisTitle = "Total Lines Changed";
          color = isDark ? "#3fb950" : "#87bc45";
          break;
        case "complex":
          data = topFilesData.mostComplex;
          xAxisTitle = "Complexity Score";
          color = isDark ? "#a5a5ff" : "#b33dc6";
          break;
      }
      if (data.length === 0) {
        container.innerHTML = '<div class="text-muted text-center p-4">No data available</div>';
        return;
      }
      const truncateFileName = (fileName, maxLength = 40) => {
        if (fileName.length <= maxLength) return fileName;
        const parts = fileName.split("/");
        if (parts.length === 1) {
          return "..." + fileName.slice(-(maxLength - 3));
        }
        const file = parts[parts.length - 1];
        if (!file) {
          return "..." + fileName.slice(-(maxLength - 3));
        }
        if (file.length >= maxLength - 3) {
          return "..." + file.slice(-(maxLength - 3));
        }
        let result = file;
        for (let i = parts.length - 2; i >= 0; i--) {
          const part = parts[i];
          if (!part) continue;
          const newResult = part + "/" + result;
          if (newResult.length + 3 > maxLength) {
            return "..." + result;
          }
          result = newResult;
        }
        return result;
      };
      const options = {
        chart: {
          type: "bar",
          height: 400,
          toolbar: { show: false },
          background: isDark ? "#161b22" : "#ffffff"
        },
        plotOptions: {
          bar: {
            horizontal: true,
            borderRadius: 4,
            distributed: false,
            dataLabels: {
              position: "top"
            }
          }
        },
        series: [{
          name: xAxisTitle,
          data: data.map((f) => f.value)
        }],
        xaxis: {
          title: {
            text: xAxisTitle,
            style: { color: isDark ? "#f0f6fc" : "#24292f" }
          },
          labels: {
            style: { colors: isDark ? "#f0f6fc" : "#24292f" },
            formatter: (value) => {
              return value.toLocaleString();
            }
          }
        },
        yaxis: {
          labels: {
            show: false
          }
        },
        colors: [color],
        grid: {
          borderColor: isDark ? "#30363d" : "#e1e4e8",
          xaxis: {
            lines: { show: true }
          },
          yaxis: {
            lines: { show: false }
          },
          padding: {
            left: 20,
            right: 20
          }
        },
        dataLabels: {
          enabled: true,
          textAnchor: "start",
          style: {
            fontSize: "13px",
            fontWeight: 600,
            colors: [isDark ? "#f0f6fc" : "#24292f"]
          },
          offsetX: 10,
          formatter: (_val, opts) => {
            const fileData = data[opts.dataPointIndex];
            if (!fileData) return "";
            return truncateFileName(fileData.fileName, 45);
          },
          dropShadow: {
            enabled: true,
            color: isDark ? "#0d1117" : "#ffffff",
            blur: 3,
            opacity: 0.8
          }
        },
        tooltip: {
          theme: isDark ? "dark" : "light",
          y: {
            formatter: (value) => {
              return value.toLocaleString();
            }
          },
          custom: ({ dataPointIndex }) => {
            const file = data[dataPointIndex];
            if (!file) return '<div class="p-2">No data</div>';
            let content = `
            <div class="p-2">
              <div class="fw-bold">${file.fileName}</div>
              <div>${xAxisTitle}: ${file.value.toLocaleString()}`;
            if (activeTab === "largest") {
              content += " loc</div>";
            } else {
              content += `</div>
              <div>Percentage: ${file.percentage.toFixed(1)}%</div>`;
            }
            content += "</div>";
            return content;
          }
        }
      };
      this.chart = new window.ApexCharts(container, options);
      this.chart.render();
    }
    updateTab(activeTab) {
      if (this.currentData) {
        this.render(this.currentData, activeTab);
      }
    }
    destroy() {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      this.currentData = null;
    }
  };

  // src/chart/chart-renderers.ts
  var ChartRenderers = class {
    constructor(data) {
      this.data = data;
      __publicField(this, "contributorsChart");
      __publicField(this, "fileTypesChart");
      __publicField(this, "growthChart");
      __publicField(this, "commitActivityChart");
      __publicField(this, "wordCloudChart");
      __publicField(this, "fileHeatmapChart");
      __publicField(this, "topFilesChart");
      this.contributorsChart = new ContributorsChart("contributorsChart");
      this.fileTypesChart = new FileTypesChart("fileTypesChart");
      this.growthChart = new GrowthChart("growthChart");
      this.commitActivityChart = new CommitActivityChart("commitActivityChart");
      this.wordCloudChart = new WordCloudChart("wordCloudChart");
      this.fileHeatmapChart = new FileHeatmapChart("fileHeatmapChart");
      this.topFilesChart = new TopFilesChart("topFilesChart");
    }
    renderAllCharts() {
      renderWithErrorBoundary("contributorsChart", "Contributors Chart", () => {
        this.contributorsChart.render(this.data.contributors);
      });
      renderWithErrorBoundary("fileTypesChart", "File Types Chart", () => {
        this.fileTypesChart.render(this.data.fileTypes);
      });
      renderWithErrorBoundary("growthChart", "Growth Chart", () => {
        this.growthChart.render(this.data.linearSeries, this.data.timeSeries, "commit", this.data.commits);
      });
      renderWithErrorBoundary("commitActivityChart", "Commit Activity Chart", () => {
        this.commitActivityChart.render(this.data.timeSeries);
      });
      renderWithErrorBoundary("wordCloudChart", "Word Cloud Chart", () => {
        this.wordCloudChart.render(this.data.wordCloudData);
      });
      renderWithErrorBoundary("fileHeatmapChart", "File Heatmap Chart", () => {
        this.fileHeatmapChart.render(this.data.fileHeatData);
      });
      if (this.data.topFilesData) {
        renderWithErrorBoundary("topFilesChart", "Top Files Chart", () => {
          this.topFilesChart.render(this.data.topFilesData, "largest");
        });
      }
    }
    renderUserCharts(filteredContributors) {
      const container = document.getElementById("userChartsContainer");
      if (!container) return;
      container.innerHTML = "";
      filteredContributors.forEach((contributor, index) => {
        try {
          this.renderUserChart(contributor, index, container);
        } catch (error) {
          console.error(`Failed to render chart for ${contributor.name}:`, formatError(error));
          const col = document.createElement("div");
          col.className = "col-12 col-xl-6 mb-4";
          col.innerHTML = `
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">${contributor.name}</h5>
            </div>
            <div class="card-body">
              <div class="alert alert-warning d-flex align-items-center" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <div>
                  <h6 class="alert-heading mb-1">Chart Unavailable</h6>
                  <small>User chart could not be rendered. Please check the console for details.</small>
                </div>
              </div>
            </div>
          </div>
        `;
          container.appendChild(col);
        }
      });
    }
    renderUserChart(contributor, index, container) {
      const userCommits = this.data.commits.filter((c) => c.authorName === contributor.name);
      const col = document.createElement("div");
      col.className = "col-12 col-xl-6 mb-4";
      const card = document.createElement("div");
      card.className = "card";
      const cardHeader = document.createElement("div");
      cardHeader.className = "card-header d-flex justify-content-between align-items-center";
      cardHeader.innerHTML = `
      <h5 class="card-title mb-0">${contributor.name}</h5>
      <small class="text-muted">${contributor.commits} commits</small>
    `;
      const cardBody = document.createElement("div");
      cardBody.className = "card-body";
      const controls = document.createElement("div");
      controls.className = "mb-3";
      const xAxisGroup = document.createElement("div");
      xAxisGroup.className = "btn-group btn-group-sm me-3";
      xAxisGroup.setAttribute("role", "group");
      const dateRadio = document.createElement("input");
      dateRadio.type = "radio";
      dateRadio.className = "btn-check";
      dateRadio.name = "userXAxis" + index;
      dateRadio.id = "userXAxisDate" + index;
      dateRadio.value = "date";
      const dateLabel = document.createElement("label");
      dateLabel.className = "btn btn-outline-primary";
      dateLabel.setAttribute("for", "userXAxisDate" + index);
      dateLabel.textContent = "By Date";
      const commitRadio = document.createElement("input");
      commitRadio.type = "radio";
      commitRadio.className = "btn-check";
      commitRadio.name = "userXAxis" + index;
      commitRadio.id = "userXAxisCommit" + index;
      commitRadio.value = "commit";
      commitRadio.checked = true;
      const commitLabel = document.createElement("label");
      commitLabel.className = "btn btn-outline-primary";
      commitLabel.setAttribute("for", "userXAxisCommit" + index);
      commitLabel.textContent = "By Commit";
      xAxisGroup.appendChild(dateRadio);
      xAxisGroup.appendChild(dateLabel);
      xAxisGroup.appendChild(commitRadio);
      xAxisGroup.appendChild(commitLabel);
      const metricGroup = document.createElement("div");
      metricGroup.className = "btn-group btn-group-sm";
      metricGroup.setAttribute("role", "group");
      const linesRadio = document.createElement("input");
      linesRadio.type = "radio";
      linesRadio.className = "btn-check";
      linesRadio.name = "userMetric" + index;
      linesRadio.id = "userMetricLines" + index;
      linesRadio.value = "lines";
      linesRadio.checked = true;
      const linesLabel = document.createElement("label");
      linesLabel.className = "btn btn-outline-secondary";
      linesLabel.setAttribute("for", "userMetricLines" + index);
      linesLabel.textContent = "Lines";
      const bytesRadio = document.createElement("input");
      bytesRadio.type = "radio";
      bytesRadio.className = "btn-check";
      bytesRadio.name = "userMetric" + index;
      bytesRadio.id = "userMetricBytes" + index;
      bytesRadio.value = "bytes";
      const bytesLabel = document.createElement("label");
      bytesLabel.className = "btn btn-outline-secondary";
      bytesLabel.setAttribute("for", "userMetricBytes" + index);
      bytesLabel.textContent = "Bytes";
      metricGroup.appendChild(linesRadio);
      metricGroup.appendChild(linesLabel);
      metricGroup.appendChild(bytesRadio);
      metricGroup.appendChild(bytesLabel);
      controls.appendChild(xAxisGroup);
      controls.appendChild(metricGroup);
      const chartDiv = document.createElement("div");
      chartDiv.id = "userChart" + index;
      cardBody.appendChild(controls);
      cardBody.appendChild(chartDiv);
      card.appendChild(cardHeader);
      card.appendChild(cardBody);
      col.appendChild(card);
      container.appendChild(col);
      this.renderUserChartInstance(userCommits, index);
      const xAxisRadios = xAxisGroup.querySelectorAll('input[type="radio"]');
      const metricRadios = metricGroup.querySelectorAll('input[type="radio"]');
      xAxisRadios.forEach((radio) => {
        radio.addEventListener("change", () => this.renderUserChartInstance(userCommits, index));
      });
      metricRadios.forEach((radio) => {
        radio.addEventListener("change", () => this.renderUserChartInstance(userCommits, index));
      });
    }
    renderUserChartInstance(userCommits, index) {
      const xAxis = document.querySelector(`input[name="userXAxis${index}"]:checked`)?.value || "commit";
      const metric = document.querySelector(`input[name="userMetric${index}"]:checked`)?.value || "lines";
      const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
      const { addedData, removedData, netData } = buildUserTimeSeriesData(userCommits, xAxis, metric, this.data.timeSeries);
      const existingChart = window.userChartInstances?.[index];
      if (existingChart) {
        existingChart.destroy();
      }
      const options = {
        chart: {
          type: "area",
          height: 350,
          toolbar: { show: false },
          background: isDark ? "#161b22" : "#ffffff",
          zoom: {
            enabled: true,
            allowMouseWheelZoom: false
          }
        },
        series: [
          { name: "Added", data: addedData },
          { name: "Removed", data: removedData },
          { name: "Net", data: netData }
        ],
        dataLabels: { enabled: false },
        stroke: { curve: "smooth" },
        xaxis: {
          type: xAxis === "date" ? "datetime" : "numeric",
          title: {
            text: xAxis === "date" ? "Date" : "Commit Number",
            style: { color: isDark ? "#f0f6fc" : "#24292f" }
          },
          labels: {
            datetimeFormatter: {
              year: "yyyy",
              month: "MMM yyyy",
              day: "dd MMM",
              hour: "HH:mm"
            },
            style: { colors: isDark ? "#f0f6fc" : "#24292f" },
            formatter: xAxis === "commit" ? function(val) {
              return Math.floor(val);
            } : void 0
          }
        },
        yaxis: {
          title: {
            text: metric === "lines" ? "Lines of Code" : "Repository Size",
            style: { color: isDark ? "#f0f6fc" : "#24292f" }
          },
          labels: {
            style: { colors: isDark ? "#f0f6fc" : "#24292f" }
          }
        },
        colors: ["#22c55e", "#ef4444", "#3b82f6"],
        fill: { type: "gradient" },
        legend: {
          labels: { colors: isDark ? "#f0f6fc" : "#24292f" }
        },
        grid: {
          borderColor: isDark ? "#30363d" : "#e1e4e8"
        }
      };
      const chartContainer = document.querySelector("#userChart" + index);
      const chart = new window.ApexCharts(chartContainer, options);
      chart.render();
      if (!window.userChartInstances) {
        window.userChartInstances = {};
      }
      window.userChartInstances[index] = chart;
    }
    updateChartsTheme() {
      renderWithErrorBoundary("contributorsChart", "Contributors Chart", () => {
        this.contributorsChart.render(this.data.contributors);
      });
      renderWithErrorBoundary("fileTypesChart", "File Types Chart", () => {
        this.fileTypesChart.render(this.data.fileTypes);
      });
      renderWithErrorBoundary("growthChart", "Growth Chart", () => {
        this.growthChart.render(this.data.linearSeries, this.data.timeSeries, "commit", this.data.commits);
      });
      renderWithErrorBoundary("commitActivityChart", "Commit Activity Chart", () => {
        this.commitActivityChart.render(this.data.timeSeries);
      });
      renderWithErrorBoundary("wordCloudChart", "Word Cloud Chart", () => {
        this.wordCloudChart.render(this.data.wordCloudData);
      });
      renderWithErrorBoundary("fileHeatmapChart", "File Heatmap Chart", () => {
        this.fileHeatmapChart.render(this.data.fileHeatData);
      });
      const filteredContributors = this.data.contributors.filter((c) => c.commits > 0);
      this.renderUserCharts(filteredContributors);
    }
    getChartInstances() {
      return {
        contributors: this.contributorsChart,
        fileTypes: this.fileTypesChart,
        growth: this.growthChart,
        commitActivity: this.commitActivityChart,
        wordCloud: this.wordCloudChart,
        fileHeatmap: this.fileHeatmapChart,
        topFiles: this.topFilesChart
      };
    }
    getTopFilesChart() {
      return this.topFilesChart;
    }
  };

  // src/chart/filter-system.ts
  function applyFilters(originalCommits, filters) {
    return originalCommits.filter((commit) => {
      if (filters.authorFilter && commit.authorName !== filters.authorFilter) return false;
      const commitDate = new Date(commit.date);
      if (filters.dateFromFilter && commitDate < new Date(filters.dateFromFilter)) return false;
      if (filters.dateToFilter && commitDate > new Date(filters.dateToFilter)) return false;
      if (filters.fileTypeFilter && !commit.filesChanged.some((f) => f.fileType === filters.fileTypeFilter)) return false;
      return true;
    });
  }
  function recalculateData(filteredCommits) {
    const contributorMap = /* @__PURE__ */ new Map();
    for (const commit of filteredCommits) {
      if (!contributorMap.has(commit.authorName)) {
        contributorMap.set(commit.authorName, {
          name: commit.authorName,
          commits: 0,
          linesAdded: 0,
          linesDeleted: 0
        });
      }
      const existing = contributorMap.get(commit.authorName);
      existing.commits += 1;
      existing.linesAdded += commit.linesAdded;
      existing.linesDeleted += commit.linesDeleted;
    }
    const contributors = Array.from(contributorMap.values()).sort((a, b) => b.commits - a.commits);
    const fileTypeMap = /* @__PURE__ */ new Map();
    for (const commit of filteredCommits) {
      for (const fileChange of commit.filesChanged) {
        const existing = fileTypeMap.get(fileChange.fileType) ?? 0;
        fileTypeMap.set(fileChange.fileType, existing + fileChange.linesAdded);
      }
    }
    const total = Array.from(fileTypeMap.values()).reduce((sum, lines) => sum + lines, 0);
    const fileTypes = Array.from(fileTypeMap.entries()).map(([type, lines]) => ({
      type,
      lines,
      percentage: total > 0 ? lines / total * 100 : 0
    })).sort((a, b) => b.lines - a.lines);
    const timeSeriesMap = /* @__PURE__ */ new Map();
    let cumulativeLines = 0;
    let cumulativeBytes = 0;
    for (const commit of filteredCommits) {
      const dateKey = new Date(commit.date).toISOString().split("T")[0];
      if (!timeSeriesMap.has(dateKey)) {
        timeSeriesMap.set(dateKey, {
          date: dateKey,
          commits: 0,
          linesAdded: 0,
          linesDeleted: 0,
          cumulativeLines: 0,
          cumulativeBytes: 0
        });
      }
      const existing = timeSeriesMap.get(dateKey);
      existing.commits += 1;
      existing.linesAdded += commit.linesAdded;
      existing.linesDeleted += commit.linesDeleted;
      cumulativeLines += commit.linesAdded;
      cumulativeBytes += commit.estimatedBytes || commit.linesAdded * 50;
      existing.cumulativeLines = cumulativeLines;
      existing.cumulativeBytes = cumulativeBytes;
    }
    const timeSeries = Array.from(timeSeriesMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    timeSeries.forEach((point, index) => {
      point.commitIndex = index;
    });
    const linearSeries = filteredCommits.map((_, index) => ({
      commitIndex: index + 1,
      cumulativeLines: filteredCommits.slice(0, index + 1).reduce((sum, c) => sum + c.linesAdded, 0),
      cumulativeBytes: filteredCommits.slice(0, index + 1).reduce(
        (sum, c) => sum + (c.estimatedBytes || c.linesAdded * 50),
        0
      )
    }));
    const messages = filteredCommits.map((c) => c.message);
    const words = messages.join(" ").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((word) => word.length > 2).filter((word) => ![
      "the",
      "and",
      "for",
      "are",
      "but",
      "not",
      "you",
      "all",
      "can",
      "had",
      "her",
      "was",
      "one",
      "our",
      "out",
      "day",
      "get",
      "has",
      "him",
      "his",
      "how",
      "may",
      "new",
      "now",
      "old",
      "see",
      "two",
      "who",
      "boy",
      "did",
      "its",
      "let",
      "put",
      "say",
      "she",
      "too",
      "use",
      "with"
    ].includes(word));
    const wordFreq = /* @__PURE__ */ new Map();
    words.forEach((word) => wordFreq.set(word, (wordFreq.get(word) || 0) + 1));
    const wordCloudData = Array.from(wordFreq.entries()).map(([text, freq]) => ({ text, weight: freq })).sort((a, b) => b.weight - a.weight).slice(0, 200);
    const fileMap = /* @__PURE__ */ new Map();
    for (const commit of filteredCommits) {
      const commitDate = new Date(commit.date);
      for (const fileChange of commit.filesChanged) {
        const existing = fileMap.get(fileChange.fileName);
        if (!existing) {
          fileMap.set(fileChange.fileName, {
            fileName: fileChange.fileName,
            commitCount: 1,
            lastModified: commitDate,
            totalLines: fileChange.linesAdded - fileChange.linesDeleted,
            fileType: fileChange.fileType
          });
        } else {
          existing.commitCount += 1;
          existing.totalLines += fileChange.linesAdded - fileChange.linesDeleted;
          if (commitDate > existing.lastModified) {
            existing.lastModified = commitDate;
          }
        }
      }
    }
    const fileHeatData = Array.from(fileMap.values()).filter((f) => f.totalLines > 0);
    return {
      contributors,
      fileTypes,
      timeSeries,
      linearSeries,
      wordCloudData,
      fileHeatData
    };
  }
  function populateAuthorFilter(commits) {
    return [...new Set(commits.map((c) => c.authorName))].sort();
  }
  function populateFileTypeFilter(commits) {
    return [...new Set(commits.flatMap((c) => c.filesChanged.map((f) => f.fileType)))].sort();
  }
  function getDateRange(commits) {
    const dates = commits.map((c) => new Date(c.date));
    return {
      minDate: new Date(Math.min(...dates.map((d) => d.getTime()))),
      maxDate: new Date(Math.max(...dates.map((d) => d.getTime())))
    };
  }
  function clearFilters() {
    return {
      authorFilter: "",
      dateFromFilter: "",
      dateToFilter: "",
      fileTypeFilter: ""
    };
  }
  function getFilterStatus(filteredCommits, originalCommits) {
    return `Showing ${filteredCommits.length} of ${originalCommits.length} commits`;
  }

  // src/chart/event-handlers.ts
  var EventHandlers = class {
    constructor(data, renderers) {
      this.data = data;
      this.renderers = renderers;
    }
    setupEventListeners() {
      this.setupThemeToggle();
      this.setupXAxisToggle();
      this.setupFilterSystem();
      this.setupClearFiltersButton();
      this.setupTopFilesTabs();
    }
    setupThemeToggle() {
      const themeToggle = document.getElementById("themeToggle");
      if (themeToggle) {
        themeToggle.addEventListener("click", () => {
          const currentTheme = document.documentElement.getAttribute("data-bs-theme");
          const newTheme = currentTheme === "dark" ? "light" : "dark";
          document.documentElement.setAttribute("data-bs-theme", newTheme);
          this.renderers.updateChartsTheme();
        });
      }
    }
    setupXAxisToggle() {
      const chartInstances = this.renderers.getChartInstances();
      const growthRadios = document.querySelectorAll('input[name="growthXAxis"]');
      growthRadios.forEach((radio) => {
        radio.addEventListener("change", (e) => {
          const target = e.target;
          const xAxis = target.value;
          chartInstances.growth.render(this.data.linearSeries, this.data.timeSeries, xAxis, this.data.commits);
        });
      });
    }
    setupFilterSystem() {
      populateAuthorFilter(this.data.commits);
      populateFileTypeFilter(this.data.commits);
      const dateRange = getDateRange(this.data.commits);
      this.populateDateFilter(dateRange);
      this.setupAuthorFilter();
      this.setupFileTypeFilter();
      this.setupDateFilter();
    }
    populateDateFilter(dateRange) {
      const startInput = document.getElementById("dateFromFilter");
      const endInput = document.getElementById("dateToFilter");
      startInput.value = dateRange.minDate.toISOString().split("T")[0];
      startInput.max = dateRange.maxDate.toISOString().split("T")[0];
      endInput.value = dateRange.maxDate.toISOString().split("T")[0];
      endInput.min = dateRange.minDate.toISOString().split("T")[0];
    }
    setupAuthorFilter() {
      const authorSelect = document.getElementById("authorFilter");
      authorSelect.addEventListener("change", () => {
        this.applyFiltersAndUpdate();
      });
    }
    setupFileTypeFilter() {
      const fileTypeSelect = document.getElementById("fileTypeFilter");
      fileTypeSelect.addEventListener("change", () => {
        this.applyFiltersAndUpdate();
      });
    }
    setupDateFilter() {
      const startInput = document.getElementById("dateFromFilter");
      const endInput = document.getElementById("dateToFilter");
      startInput.addEventListener("change", () => {
        this.applyFiltersAndUpdate();
      });
      endInput.addEventListener("change", () => {
        this.applyFiltersAndUpdate();
      });
    }
    setupClearFiltersButton() {
      const clearButton = document.getElementById("clearFilters");
      clearButton.addEventListener("click", () => {
        clearFilters();
        this.updateFilterUI();
        this.applyFiltersAndUpdate();
      });
    }
    updateFilterUI() {
      const authorSelect = document.getElementById("authorFilter");
      const fileTypeSelect = document.getElementById("fileTypeFilter");
      const startInput = document.getElementById("dateFromFilter");
      const endInput = document.getElementById("dateToFilter");
      authorSelect.value = "all";
      fileTypeSelect.value = "all";
      const dateRange = getDateRange(this.data.commits);
      startInput.value = dateRange.minDate.toISOString().split("T")[0];
      endInput.value = dateRange.maxDate.toISOString().split("T")[0];
    }
    applyFiltersAndUpdate() {
      const filters = this.getCurrentFilters();
      const filteredCommits = applyFilters(this.data.commits, filters);
      const recalculatedData = recalculateData(filteredCommits);
      this.renderers.renderAllCharts();
      const filteredContributors = recalculatedData.contributors.filter((c) => c.commits > 0);
      this.renderers.renderUserCharts(filteredContributors);
      this.updateFilterStatus(filters);
    }
    getCurrentFilters() {
      const authorSelect = document.getElementById("authorFilter");
      const fileTypeSelect = document.getElementById("fileTypeFilter");
      const startInput = document.getElementById("dateFromFilter");
      const endInput = document.getElementById("dateToFilter");
      return {
        authorFilter: authorSelect.value,
        fileTypeFilter: fileTypeSelect.value,
        dateFromFilter: startInput.value,
        dateToFilter: endInput.value
      };
    }
    updateFilterStatus(filters) {
      const status = getFilterStatus(filters, this.data.commits);
      const statusElement = document.getElementById("filterStatus");
      statusElement.innerHTML = `
      <div class="alert alert-info">
        <strong>Filters Active:</strong> ${status}
      </div>
    `;
    }
    setupTopFilesTabs() {
      const tabElement = document.querySelector("#largest-tab");
      if (tabElement && this.data.topFilesData) {
        const topFilesChart = this.renderers.getTopFilesChart();
        const tabTriggers = document.querySelectorAll('button[data-bs-toggle="tab"]');
        tabTriggers.forEach((trigger) => {
          trigger.addEventListener("shown.bs.tab", (event) => {
            const target = event.target;
            const tabId = target.id;
            if (tabId === "largest-tab") {
              topFilesChart.render(this.data.topFilesData, "largest");
            } else if (tabId === "churn-tab") {
              topFilesChart.render(this.data.topFilesData, "churn");
            } else if (tabId === "complex-tab") {
              topFilesChart.render(this.data.topFilesData, "complex");
            }
          });
        });
      }
    }
  };

  // src/chart/chart-initializer.ts
  var ChartInitializer = class {
    constructor(data, renderers, eventHandlers) {
      this.data = data;
      this.renderers = renderers;
      this.eventHandlers = eventHandlers;
    }
    initialize() {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.initializeCharts());
      } else {
        this.initializeCharts();
      }
    }
    initializeCharts() {
      this.renderers.renderAllCharts();
      const topContributors = this.data.contributors.slice(0, 10);
      this.renderers.renderUserCharts(topContributors);
      if (this.data.awards) {
        try {
          this.renderAwards();
        } catch (error) {
          console.error("Failed to render awards:", formatError(error));
          const container = document.getElementById("awardsContainer");
          if (container) {
            container.innerHTML = `
            <div class="col-12">
              <div class="alert alert-warning d-flex align-items-center" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <div>
                  <h6 class="alert-heading mb-1">Awards Unavailable</h6>
                  <small>Awards section could not be rendered. Please check the console for details.</small>
                </div>
              </div>
            </div>
          `;
          }
        }
      }
      this.eventHandlers.setupEventListeners();
      this.initializeTheme();
    }
    initializeTheme() {
      const savedTheme = localStorage.getItem("theme");
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      let theme = savedTheme || (systemPrefersDark ? "dark" : "light");
      document.documentElement.setAttribute("data-bs-theme", theme);
      const themeToggle = document.getElementById("theme-toggle");
      if (themeToggle) {
        const icon = themeToggle.querySelector("i");
        if (icon) {
          icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
        }
      }
      localStorage.setItem("theme", theme);
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        if (!localStorage.getItem("theme")) {
          const newTheme = e.matches ? "dark" : "light";
          document.documentElement.setAttribute("data-bs-theme", newTheme);
          this.renderers.updateChartsTheme();
        }
      });
    }
    renderAwards() {
      const container = document.getElementById("awardsContainer");
      if (!container || !this.data.awards) return;
      const awards = this.data.awards;
      const awardCategories = [
        { title: "Most Files Modified", data: awards.filesModified, icon: "\u{1F4C1}", color: "primary", type: "commit" },
        { title: "Most Bytes Added", data: awards.bytesAdded, icon: "\u2795", color: "success", type: "commit" },
        { title: "Most Bytes Removed", data: awards.bytesRemoved, icon: "\u2796", color: "danger", type: "commit" },
        { title: "Most Lines Added", data: awards.linesAdded, icon: "\u{1F4C8}", color: "info", type: "commit" },
        { title: "Most Lines Removed", data: awards.linesRemoved, icon: "\u{1F4C9}", color: "warning", type: "commit" },
        { title: "Lowest Average Lines Changed", data: awards.lowestAverage, icon: "\u{1F3AF}", color: "secondary", type: "contributor" },
        { title: "Highest Average Lines Changed", data: awards.highestAverage, icon: "\u{1F4A5}", color: "dark", type: "contributor" }
      ];
      container.innerHTML = "";
      awardCategories.forEach((category) => {
        if (category.data.length === 0) return;
        const col = document.createElement("div");
        col.className = "col-lg-4 col-md-6 mb-4";
        const card = document.createElement("div");
        card.className = "card h-100";
        const cardHeader = document.createElement("div");
        cardHeader.className = `card-header bg-${category.color} text-white`;
        cardHeader.innerHTML = `
        <h6 class="mb-0">
          <span class="me-2" style="font-size: 1.2em;">${category.icon}</span>
          ${category.title}
        </h6>
      `;
        const cardBody = document.createElement("div");
        cardBody.className = "card-body";
        const list = document.createElement("ol");
        list.className = "list-group list-group-flush";
        category.data.forEach((award) => {
          const item = document.createElement("li");
          item.className = "list-group-item d-flex justify-content-between align-items-start";
          const content = document.createElement("div");
          content.className = "ms-2 me-auto";
          const header = document.createElement("div");
          header.className = "fw-bold";
          const meta = document.createElement("small");
          meta.className = "text-muted";
          const badge = document.createElement("span");
          badge.className = `badge bg-${category.color} rounded-pill`;
          if (category.type === "commit") {
            header.textContent = award.message.length > 50 ? award.message.substring(0, 50) + "..." : award.message;
            const commitLink = this.data.githubUrl ? `<a href="${this.data.githubUrl}/commit/${award.sha}" target="_blank" class="text-decoration-none" title="${award.sha}">
              ${award.sha.substring(0, 7)}
            </a>` : `<span title="${award.sha}">${award.sha.substring(0, 7)}</span>`;
            meta.innerHTML = `
            ${award.authorName} \u2022 
            ${new Date(award.date).toLocaleDateString()} \u2022 
            ${commitLink}
          `;
            badge.textContent = award.value.toLocaleString();
          } else {
            header.textContent = award.name;
            meta.innerHTML = `
            ${award.commits} commits \u2022 
            ${award.averageLinesChanged.toFixed(1)} avg lines/commit
          `;
            badge.textContent = award.averageLinesChanged.toFixed(1);
          }
          content.appendChild(header);
          content.appendChild(meta);
          item.appendChild(content);
          item.appendChild(badge);
          list.appendChild(item);
        });
        cardBody.appendChild(list);
        card.appendChild(cardHeader);
        card.appendChild(cardBody);
        col.appendChild(card);
        container.appendChild(col);
      });
    }
  };

  // src/chart/page-script.ts
  var PageScript = class {
    constructor(data) {
      __publicField(this, "renderers");
      __publicField(this, "eventHandlers");
      __publicField(this, "initializer");
      this.renderers = new ChartRenderers(data);
      this.eventHandlers = new EventHandlers(data, this.renderers);
      this.initializer = new ChartInitializer(data, this.renderers, this.eventHandlers);
    }
    initialize() {
      this.initializer.initialize();
    }
  };
  function initializePageScript(data) {
    const pageScript = new PageScript(data);
    pageScript.initialize();
  }
  return __toCommonJS(page_script_exports);
})();

  
  // Export the initialization function to global scope
  window.initializePageScript = PageScript.initializePageScript;
})();
