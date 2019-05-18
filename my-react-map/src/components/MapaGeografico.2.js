import React, { Component } from 'react';
import * as d3 from 'd3';
import * as topojson from "topojson-client";
import '../css/geomap.css'

class MapaGeografico extends Component {

  state = {
    br: {},
    analfabestimo: {},
  }

  locale = {
    decimal: ",",
    thousands: ".",
    grouping: [3],
    currency: ["R$", ""]
  }


  drawed = false;

  color = d3.scaleQuantize().domain([0, 40]).range(d3.schemeReds[9]);

  getData() {
    if (!("objects" in this.state.br)) {
      Promise.all([
        d3.json("/brasil_estados_cidades_topo.json"),
        d3.csv("/analfabetismo_municipios_brasil_2010.csv", ({ Município, rate, codigo_uf }) => [codigo_uf + '-' + Município, +rate]),
      ]).then(([br, analfabestimo]) => {


        this.states = new Map(br.objects.states.geometries.map(d => [d.id, d.properties]));

        this.cities = new Map(br.objects.cities.geometries.map(d => [d.id, d.properties]))


        this.setState({
          br: br,
          analfabestimo: analfabestimo,
        });

      }).catch(err => console.log('Error loading or parsing data.'));
    }
  }

  legend(g) {

    const x = d3.scaleLinear()
      .domain(d3.extent(this.color.domain()))
      .rangeRound([0, 260]);

    g.selectAll("rect")
      .data(this.color.range().map(d => this.color.invertExtent(d)))
      .join("rect")
      .attr("height", 8)
      .attr("x", d => x(d[0]))
      .attr("width", d => x(d[1]) - x(d[0]))
      .attr("fill", d => this.color(d[0]));

    g.append("text")
      .attr("x", x.range()[0])
      .attr("y", -6)
      .attr("fill", "currentColor")
      .attr("text-anchor", "start")
      .attr("font-weight", "bold")
      .text(this.data.title);

    g.call(d3.axisBottom(x)
      .tickSize(13)
      .tickFormat(d => this.format(d))
      .tickValues(this.color.range().slice(1).map(d => this.color.invertExtent(d)[0])))
      .select(".domain")
      .remove();
  }

  drawChart(state) {

    let { br, analfabestimo } = state;

    if ("objects" in br && this.drawed === false) {

      this.drawed = true;

      this.data = Object.assign(new Map(analfabestimo), { title: "Taxa de Analfabetismo por município (%) em 2010" });

      this.format = d3.formatDefaultLocale(this.locale).format(".1f");

      this.svg = d3.select("svg.mapa")
        .style("width", "100%");

      let width = this.svg.attr('width');
      let height = this.svg.attr('height');

      // this.deltax = 700;
      this.deltax = 900;

      var projection = d3.geoMercator()
        .scale(750)
        .translate([width / 2 + this.deltax, height / 2 - 200]);

      this.path = d3.geoPath().projection(projection);

      const gcities = this.svg.append("g")
        .attr("id", "gcities");

      gcities.selectAll("path")
        .data(topojson.feature(br, br.objects.cities).features)
        .join("path")
        .attr("fill", d => this.color(this.data.get(`${d.id.slice(0, 2)}-${d.properties.name}`)))
        .attr("stroke", "none")
        .attr("id", d => `feature_${d.id}`)
        .attr("class", "municipio")
        //.attr("stroke-width", 0.005)
        .attr("d", this.path)
        .append("title")
        .text(d => `${d.properties.name}, ${this.states.get(d.id.slice(0, 2)).name}
${isNaN(this.data.get(`${d.id.slice(0, 2)}-${d.properties.name}`)) ? 'Não disponível' : `${this.format(this.data.get(`${d.id.slice(0, 2)}-${d.properties.name}`))}%`}`);

      const gstates = this.svg.append("g")
        .attr("id", "gstates");

      gstates.selectAll("path")
        .data(topojson.feature(br, br.objects.states).features)
        .join("path")
        .attr("fill", "gray")
        .attr("stroke", "black")
        .attr("id", d => `feature_${d.id}`)
        .attr("class", "estado")
        .attr("stroke-width", 0.3)
        .attr("stroke-linejoin", "round")
        .attr("fill-opacity", 0)
        .attr("d", this.path)
        .append("title")
        .text(d => d.properties.name);

      this.zoom = d3.zoom()
        .on("zoom", () => {
          this.zoomed = true;
          d3.select('#reset_button')
            .attr("display", "block");
          gstates.attr("transform", d3.event.transform);
          gcities.attr("transform", d3.event.transform);
        });

      this.svg.append("g")
        .attr("transform", "translate(700, 30) scale(1.3)")
        .call(this.legend.bind(this));

      this.svg.call(this.zoom);

    }
  }

  componentDidMount() {
    this.getData();
  }

  render() {
    return (
      <div>
        <svg className="mapa" width="800" height="560"></svg>
        {this.drawChart(this.state)}
      </div>
    );

  }

}

export default MapaGeografico;