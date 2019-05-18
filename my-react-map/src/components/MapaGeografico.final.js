import React, { Component } from 'react';
import * as d3 from 'd3';
import * as topojson from "topojson-client";
import Select2 from 'react-select2-wrapper';
import 'react-select2-wrapper/css/select2.css';
import '../css/geomap.css'
import $ from 'jquery';
import Button from '@material-ui/core/Button';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

const styles = theme => ({
  button: {
    margin: theme.spacing.unit,
  },
  input: {
    display: 'none',
  },
});

class MapaGeografico extends Component {

  state = {
    br: {},
    analfabestimo: {},
    estados: [],
    cidades: [],
    idEstado: null,
    idMunicipio: null,
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

        let estados = []

        this.states.forEach((valor, chave, mapa) => {
          let node = {
            text: valor.name,
            id: chave
          }
          estados.push(node);
        });

        estados.sort((a, b) => a.text.localeCompare(b.text));

        this.setState({
          br: br,
          analfabestimo: analfabestimo,
          estados: estados
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
        .on("click", this.reset)
        .style("width", "100%");

      let width = this.svg.attr('width');
      let height = this.svg.attr('height');

      // this.deltax = 700;
      this.deltax = 900;

      var projection = d3.geoMercator()
        .scale(750)
        // .scale(800)
        .translate([width / 2 + this.deltax, height / 2 - 200]);

      this.path = d3.geoPath().projection(projection);

      // this.path = d3.geoPath();

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
        .on("click", this.clicked())
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
        .on("click", this.clicked())
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

      const greset = this.svg.append("g")
        .attr("id", "reset_button")
        //.attr("display", "none")
        .attr("transform", "translate(200, 500)");

      greset.append("circle")
        .attr("r", "15px")
        .attr("fill", "white")
        .attr("cx", 12)
        .attr("cy", 12)
        .on("click", this.reset.bind(this));

      greset.append("path")
        .attr("cursor", "pointer")
        .attr("class", "desenho")
        .on("click", this.reset.bind(this))
        .attr("d", "M14 12c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zm-2-9c-4.97 0-9 4.03-9 9H0l4 4 4-4H5c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.51 0-2.91-.49-4.06-1.3l-1.42 1.44C8.04 20.3 9.94 21 12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z")

      greset.append("circle")
        .attr("r", "15px")
        .attr("fill", "white")
        .attr("fill-opacity", 0)
        .attr("stroke", "gray")
        .attr("class", "reset")
        .attr("stroke-width", 0.5)
        .attr("cursor", "pointer")
        .attr("cx", 12)
        .attr("cy", 12)
        .on("click", this.reset.bind(this));

      this.svg.call(this.zoom);

    }
  }

  clicked() {

    let that = this;


    return function (d) {
      console.log("that");
      console.log(that);

      that.update(d.id);

    }
  }


  update = (id) => {

    let that = this;

    let dis = $('#feature_' + id)[0];
    let d = d3.select(dis).data()[0];

    console.log("that");
    console.log(that);
    console.log("dis");
    console.log(dis);
    console.log("d")
    console.log(d)

    console.log("recuperando os dados:")
    console.log(d3.select(dis).data())


    const path = d3.select('#feature_' + id);
    console.log("path");
    console.log(path);

    let isEstado = path.attr("class") === 'estado';
    if (isEstado) {
      console.log("clicou num estado");

      if (that.activeState) that.activeState.classed("active", false);
      that.activeState = d3.select(dis).classed("active", true);

      if (that.activeCity) {
        that.activeCity.classed("active", false);
        that.activeCity = d3.select(null);
      }

      console.log("Id Estado: " + d.id);

      d3.select("#gstates")
        .selectAll("path")
        .attr("fill", "gray")
        .attr("fill-opacity", 0.5);

      path.attr("fill", "none");



    } else {
      console.log("clicou numa cidade");
      if (that.activeCity) {
        if (that.activeCity.node() === dis) {
          console.log("Clicou na cidade que já estava selecionada");
          var ev = document.createEvent("SVGEvents");
          ev.initEvent("click", true, true);
          console.log("that.activeState.data()[0]");
          console.log(that.activeState.data()[0]);
          that.activeCity.classed("active", false);
          that.activeCity = d3.select(null);
          let stateId = that.activeState.data()[0].id
          this.update(stateId);
          return;
        } else {
          that.activeCity.classed("active", false);
          that.activeCity = d3.select(dis).classed("active", true);
        }
      } else {
        console.log("Clicou em uma cidade não selecionada antes");
        that.activeCity = d3.select(dis).classed("active", true);
      }
    }

    let idEstado = isEstado ? d.id : d.id.slice(0, 2);
    let idMunicipio = isEstado ? null : d.id;

    let cidades = []
    this.cities.forEach((valor, chave, mapa) => {
      if (idEstado === chave.slice(0, 2)) {
        let node = {
          text: valor.name,
          id: chave
        }
        cidades.push(node);
      }
    });
    cidades.sort((a, b) => a.text.localeCompare(b.text));
    this.setState({ cidades, idEstado, idMunicipio });

    console.log("d.properties.name");
    console.log(d.properties.name);

    let width = that.svg.attr('width');
    let height = that.svg.attr('height');

    var bounds = that.path.bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = Math.max(1, Math.min(35, 0.9 / Math.max(dx / width, dy / height))) * .9,
      translate = [width / 2 + that.deltax / 2 - 200 - scale * x, height / 2 - scale * y + 30];

    that.svg.transition()
      .duration(750)
      .call(that.zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));

  }

  reset() {
    if (this.activeState || this.activeCity) {
      if (this.activeState) {
        this.activeState.classed("active", false);
        this.activeState = d3.select(null);
        d3.select("#gstates")
          .selectAll("path")
          .attr("fill", "gray")
          .attr("fill-opacity", 0);
      }
      if (this.activeCity) {
        this.activeCity.classed("active", false);
        this.activeCity = d3.select(null);
      }
      let cidades = []
      let idEstado = null;
      let idMunicipio = null;
      this.setState({ cidades, idEstado, idMunicipio });
      this.svg.transition()
        .duration(750)
        .call(this.zoom.transform, d3.zoomIdentity);
    } else {
      if (this.svg) {
        this.svg.transition()
          .duration(750)
          .call(this.zoom.transform, d3.zoomIdentity);
      }
    }

    // d3.select('#reset_button')
    //   .attr("display", "none");
  }

  componentDidMount() {
    this.getData();
  }

  selectEstado = (e) => {
    e.stopImmediatePropagation();
    let selected = $("#estados").find(':selected');
    if (selected && selected[0] && selected[0].value) {
      console.log("id: ")
      console.log(selected[0].value)
      this.update(selected[0].value);
    }
  }

  selectCidade = (e) => {
    e.stopImmediatePropagation();
    let selected = $("#cidades").find(':selected');
    if (selected && selected[0] && selected[0].value) {
      console.log("id: ")
      console.log(selected[0].value)
      this.update(selected[0].value);
    }
  }



  render() {
    const { classes } = this.props;
    return (
      <div>
        <Select2 id="estados" ref="tags" style={{ width: '200px' }}
          value={this.state.idEstado}
          data={this.state.estados}
          onSelect={this.selectEstado}
          options={{
            placeholder: 'Selecione o estado',
          }} />
        <Select2 id="cidades" ref="tags" style={{ width: '200px' }}
          value={this.state.idMunicipio}
          data={this.state.cidades}
          onSelect={this.selectCidade}
          options={{
            placeholder: 'Selecione o município',
          }} />
        {this.state.idEstado && !this.state.idMunicipio &&
          <Button variant="contained" color="primary" className={classes.button} to={`/`}>
            Ver irregulares
        </Button>}
        {this.state.idMunicipio &&
          <Button variant="contained" color="primary" className={classes.button} to={`/`}>
            Ver irregulares
        </Button>}
        <svg className="mapa" width="800" height="560"></svg>
        {this.drawChart(this.state)}
      </div>
    );

  }

}

MapaGeografico.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(MapaGeografico);