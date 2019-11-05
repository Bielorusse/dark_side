/*
Module defining planets for the dark_side project.
*/


import { init_shader_program } from "./webgl_utils.js"
import { compute_sphere_data } from "../geometry.js"


function Planet(
    radius,
    name,
    color,
    central_body,
    gl,
){
    `
    Class describing a Planet.
    Constructor arguments:
        -radius         float
        -name           string
        -color          [float, float, float, float]
        -central_body   string
        -gl             WebGLRenderingContext
    Attributes:
        -radius             float
        -name               str
        -color              [float, ...]
        -central_body       str
        -vs_source          str
        -fs_source          str
        -program_info       object
            contains:
                attributes locations
                    vertex position
                    vertex color
                    vertex normal
                uniform locations
                    projection matrix
                    model view matrix
                    normal matrix
                    sun position
        -buffers            object
            contains: position, indices, color, normal buffers
        -vertices           [float, ...]
        -indices            [int, ...]
        -vertices_colors    [[float, float, float, float], ...]
        -model_view_matrix  [float, ...]
            4x4 matrix of gl-matrix module
        -normal_matrix      [float, ...]
            4x4 matrix of gl-matrix module
    Methods:
        -update_position
        -display
    `

    this.radius = radius;
    this.name = name;
    this.color = color;
    this.central_body = central_body;


    // vertex and fragment shaders
    this.vs_source = `
        attribute vec4 a_vertex_position;
        attribute vec4 a_vertex_color;
        attribute vec3 a_vertex_normal;

        uniform mat4 u_model_view_matrix;
        uniform mat4 u_projection_matrix;
        uniform mat4 u_normal_matrix;
        uniform vec3 u_sun_position;

        varying lowp vec4 v_color;
        varying highp vec3 v_lighting;

        void main(void) {
            gl_Position = u_projection_matrix * u_model_view_matrix * \
            a_vertex_position;
            v_color = a_vertex_color;

            highp vec3 ambient_light = vec3(0.3, 0.3, 0.3);
            highp vec3 sunlight_color = vec3(1.0, 1.0, 1.0);
            highp vec3 sun_vector = u_sun_position - (
                u_model_view_matrix * vec4(1.0, 1.0, 1.0, 1.0)
            ).xyz;

            highp vec4 transformed_normal = u_normal_matrix * vec4(
                a_vertex_normal,
                1.0
            );

            highp float direction_to_sun = max(
                dot(transformed_normal.xyz, normalize(sun_vector)),
                0.0
            );

            v_lighting = ambient_light + (sunlight_color * direction_to_sun);
        }
    `;
    this.fs_source = `
        varying lowp vec4 v_color;
        varying highp vec3 v_lighting;

        void main(void){
            gl_FragColor = vec4(v_color.rgb * v_lighting, v_color.a);
        }
    `;


    const shader_program = init_shader_program(
        gl,
        this.vs_source,
        this.fs_source
    );
    this.program_info = {
        program: shader_program,
        attrib_locations: {
            vertex_position: gl.getAttribLocation(
                shader_program,
                "a_vertex_position"
            ),
            vertex_color: gl.getAttribLocation(
                shader_program,
                "a_vertex_color",
            ),
            vertex_normal: gl.getAttribLocation(
                shader_program,
                "a_vertex_normal",
            )
        },
        uniform_locations: {
            projection_matrix: gl.getUniformLocation(
                shader_program,
                "u_projection_matrix"
            ),
            model_view_matrix: gl.getUniformLocation(
                shader_program,
                "u_model_view_matrix"
            ),
            normal_matrix: gl.getUniformLocation(
                shader_program,
                "u_normal_matrix",
            ),
            sun_position: gl.getUniformLocation(
                shader_program,
                "u_sun_position",
            )
        }
    };

    const position_buffer = gl.createBuffer()
    const index_buffer = gl.createBuffer()
    const color_buffer = gl.createBuffer()
    const normal_buffer = gl.createBuffer()
    this.buffers = {
        position: position_buffer,
        indices: index_buffer,
        color: color_buffer,
        normal: normal_buffer,
    }


    // filling vertices position buffer and vertices indices buffer
    const shape_data = compute_sphere_data(this.radius);
    this.vertices = shape_data[0];
    this.indices = shape_data[1];

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(this.vertices),
        gl.STATIC_DRAW,
    );

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(this.indices),
        gl.STATIC_DRAW,
    );


    // filling vertices colors buffer
    this.vertices_colors = [];
    for (var i = 0; i < this.vertices.length; i++){
        this.vertices_colors = this.vertices_colors.concat(this.color)
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(this.vertices_colors),
        gl.STATIC_DRAW,
    );

    // filling vertices normals buffer
    // sphere normal vectors have same coordinates as vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(this.vertices),
        gl.STATIC_DRAW,
    );


    this.model_view_matrix = mat4.create();

    this.normal_matrix = mat4.create();
    mat4.invert(this.normal_matrix, this.model_view_matrix);
    mat4.transpose(this.normal_matrix, this.normal_matrix);


    this.update_position = function(position_vector){
        `
        Set planet position by updating its model view matrix.
        Input:
            -position_vector    [float, float, float]
        `

        mat4.set(
            this.model_view_matrix,
            this.model_view_matrix[0],
            this.model_view_matrix[1],
            this.model_view_matrix[2],
            this.model_view_matrix[3],
            this.model_view_matrix[4],
            this.model_view_matrix[5],
            this.model_view_matrix[6],
            this.model_view_matrix[7],
            this.model_view_matrix[8],
            this.model_view_matrix[9],
            this.model_view_matrix[10],
            this.model_view_matrix[11],
            position_vector[0],
            position_vector[1],
            position_vector[2],
            this.model_view_matrix[15],
            this.model_view_matrix[16]
        );
    };

    this.display = function(projection_matrix, sun_position){
        `
        Display planet.
        Input:
            -projection_matrix  mat4 matrix
            -sun_position       [float, float, float]
        `

        gl.useProgram(this.program_info.program)

        // fetch vertices positions from buffer
        {
            const nb_components = 3; // nb values per vertex in buffer
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0
            const offset = 0
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position)
            gl.vertexAttribPointer(
                this.program_info.attrib_locations.vertex_position,
                nb_components,
                type,
                normalize,
                stride,
                offset
            )
            gl.enableVertexAttribArray(
                this.program_info.attrib_locations.vertex_position
            )
        }

        // fetch vertices colors from buffer
        {
            const nb_components = 4; // nb values per vertex in buffer
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0
            const offset = 0
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color)
            gl.vertexAttribPointer(
                this.program_info.attrib_locations.vertex_color,
                nb_components,
                type,
                normalize,
                stride,
                offset
            )
            gl.enableVertexAttribArray(
                this.program_info.attrib_locations.vertex_color
            )
        }

        // fetch vertices normals from buffer
        {
            const nb_components = 3; // nb values per vertex in buffer
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0
            const offset = 0
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal)
            gl.vertexAttribPointer(
                this.program_info.attrib_locations.vertex_normal,
                nb_components,
                type,
                normalize,
                stride,
                offset
            )
            gl.enableVertexAttribArray(
                this.program_info.attrib_locations.vertex_normal
            )
        }

        gl.uniformMatrix4fv(
            this.program_info.uniform_locations.model_view_matrix,
            false,
            this.model_view_matrix
        )
        gl.uniformMatrix4fv(
            this.program_info.uniform_locations.projection_matrix,
            false,
            projection_matrix
        )
        gl.uniformMatrix4fv(
            this.program_info.uniform_locations.normal_matrix,
            false,
            this.normal_matrix
        )
        gl.uniform3fv(
            this.program_info.uniform_locations.sun_position,
            sun_position
        )


        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices)

        // draw
        {
            const offset = 0
            const vertex_count = this.indices.length
            const type = gl.UNSIGNED_SHORT
            gl.drawElements(gl.TRIANGLES, vertex_count, type, offset)
        }
    }

}


export { Planet }