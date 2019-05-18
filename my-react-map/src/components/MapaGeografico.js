import React, { Component } from 'react';
import * as d3 from 'd3';
import * as topojson from "topojson-client";

class MapaGeografico extends Component {

  state = {
    hanseniase: {},
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
        d3.json("/hanseniase.json"),
      ]).then(([hanseniase]) => {


        //this.states = new Map(objecs.states.hanseniase.geometries.map(d => [d.id, d.properties]));

        this.hanseniase = new Map(hanseniase.geometries.map(d => [d.id, d.properties]))


        this.setState({
          hanseniase: hanseniase,
         });

      }).catch(err => console.log('Error loading or parsing data.'));
    }
  }

  drawChart(state) {

    let hanseniase = state;

    this.drawed = true;

    this.data = Object.assign(new Map(hanseniase), { title: "Taxa de Analfabetismo por município (%) em 2010" });

    //this.data = Object.assign(new Map(d3.json("https://gist.githubusercontent.com/ezequias/d60a610cf98c26d079b9a41cae036963/raw/0d1888499a8b4ec2d2dd971e4ecfce92286d13d2/hanseniase.json")), { title: "Taxa de Analfabetismo por município em 2010 (%)" });

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

      const ghanseniase = this.svg.append("g")
        .attr("id", "hanseniase");
  
        ghanseniase.selectAll("path")
        .data(topojson.feature(hanseniase).features)
        .join("path")
            .attr("fill", d => this.color(Math.trunc(d.properties.TOTAL1)))
            .attr("stroke", "none")
            .attr("id", d => `hanseniase{d.id}`)
            .attr("class", "feature")
            .attr("d", this.path)
              //.text(d => "Cidade: " + `${d.properties.NO_CIDAD0}´ + "Percentual:" + ${d.properties.TOTAL1}%`);
              .text(d => `${d.properties.NO_CIDAD0}${d.properties.TOTAL1}%`);

  var zoom = d3.zoom()
      .on("zoom", () => {
        hanseniase.attr("transform", d3.event.transform);
    });
  
  this.svg.call(zoom);

  return this.svg.node();

    }

  componentDidMount() {
    this.getData();
  }

  render() {
    return (
      <div>
        <svg className="mapa" width="800" height="560"></svg>
        {this.drawChart(this.municipios)}
      </div>
    );

  }

}

export default MapaGeografico;